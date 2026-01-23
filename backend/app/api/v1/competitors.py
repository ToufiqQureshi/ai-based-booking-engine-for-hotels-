from typing import List, Any
from fastapi import APIRouter, HTTPException, status, Depends
from sqlmodel import select, desc
from datetime import date, timedelta, datetime

from app.api.deps import CurrentUser, DbSession
from app.models.competitor import Competitor, CompetitorRate, CompetitorSource
from app.models.hotel import Hotel
from app.models.room import RoomType
from app.models.rates import RoomRate

router = APIRouter(prefix="/competitors", tags=["Competitor Rates"])

@router.get("", response_model=List[Competitor])
async def list_competitors(current_user: CurrentUser, session: DbSession):
    """List all competitors for current hotel"""
    query = select(Competitor).where(Competitor.hotel_id == current_user.hotel_id)
    result = await session.execute(query)
    return result.scalars().all()

from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks

@router.post("", response_model=Competitor)
async def add_competitor(comp_data: Competitor, current_user: CurrentUser, session: DbSession, background_tasks: BackgroundTasks):
    """Add a new competitor to track"""
    # Force hotel_id
    comp_data.hotel_id = current_user.hotel_id
    
    # Check for duplicates (URL or Name)
    existing = await session.execute(
        select(Competitor).where(
            Competitor.hotel_id == current_user.hotel_id,
            (Competitor.url == comp_data.url) | (Competitor.name == comp_data.name)
        )
    )
    existing_comp = existing.scalars().first()
    
    if existing_comp:
        return existing_comp

    session.add(comp_data)
    await session.commit()
    await session.refresh(comp_data)
    
    # NOTE: Automatic scraping disabled - now using Chrome Extension
    # Users should click "Refresh Rates" button to trigger extension-based scraping
    # background_tasks.add_task(run_background_scrape, comp_data.id)  # OLD SYSTEM - REMOVED
    
    return comp_data

@router.post("/{comp_id}/scrape")
async def trigger_scrape(comp_id: str, current_user: CurrentUser, session: DbSession, background_tasks: BackgroundTasks):
    """Manually trigger a scrape"""
    # Also background this? Yes better UX.
    background_tasks.add_task(run_background_scrape, comp_id)
    return {"message": "Scrape started in background"}

from app.core.database import async_session

async def run_background_scrape(comp_id: str):
    """Wrapper to run scrape in its own DB session"""
    print(f"Starting Background Scrape for {comp_id}")
    try:
        async with async_session() as session:
            await scrape_competitor_data(comp_id, session)
        print(f"Finished Background Scrape for {comp_id}")
    except Exception as e:
        print(f"Background Scrape CRASHED for {comp_id}: {e}")
        import traceback
        traceback.print_exc()

@router.delete("/{comp_id}")
async def delete_competitor(comp_id: str, current_user: CurrentUser, session: DbSession):
    """Delete a competitor and all their rate history"""
    comp = await session.get(Competitor, comp_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Competitor not found")
        
    if comp.hotel_id != current_user.hotel_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Delete rates explicitly first (if cascade not set, safe bet)
    rates_stmt = select(CompetitorRate).where(CompetitorRate.competitor_id == comp_id)
    rates_res = await session.execute(rates_stmt)
    rates = rates_res.scalars().all()
    for r in rates:
        await session.delete(r)
        
    await session.delete(comp)
    await session.commit()
    
    return {"message": "Competitor deleted successfully"}

# Scraper function removed - now using Chrome Extension for client-side scraping
# Data ingestion happens via POST /rates/ingest endpoint


@router.get("/rates/comparison")
async def get_rate_comparison(current_user: CurrentUser, session: DbSession, start_date: date = None):
    """
    Get data for chart: My Rate vs Competitors for next 7 days (or from start_date).
    """
    today = start_date if start_date else date.today()
    end_date = today + timedelta(days=7)
    
    # 1. Fetch My Rates (First Room Type)
    # Find first room type
    rt_query = select(RoomType).where(RoomType.hotel_id == current_user.hotel_id)
    rt_res = await session.execute(rt_query)
    room_type = rt_res.scalars().first()
    
    my_rates_map = {}
    if room_type:
        # Fetch rates
        # Simplified: Using base_price if no specific rate found?
        # Or just fetch RoomRate table.
        # For DEMO: If no explicit rates, use base_price.
        rates_query = select(RoomRate).where(
            RoomRate.room_type_id == room_type.id,
            RoomRate.date_from <= end_date,
            RoomRate.date_to >= today
        )
        # Converting complex rate ranges to daily is hard in 1 query.
        # Fallback for Demo: Just use base_price for all days.
        base_price = room_type.base_price
        for i in range(7):
            d = today + timedelta(days=i)
            my_rates_map[d] = base_price
            
    # 2. Fetch Competitor Rates
    comp_query = select(Competitor).where(Competitor.hotel_id == current_user.hotel_id)
    comp_res = await session.execute(comp_query)
    competitors = comp_res.scalars().all()
    
    # Prepare Chart Data AND Table Data
    chart_data = [] 
    table_data = []
    
    for i in range(7):
        d = today + timedelta(days=i)
        date_str = d.strftime("%d %b")
        
        # Chart Point
        day_chart = {
            "date": date_str,
            "My Hotel": my_rates_map.get(d, 0)
        }
        
        # Table Row
        day_table = {
            "date": date_str,
            "full_date": d.isoformat(),
            "my_rate": {
                "price": my_rates_map.get(d, 0),
                "room_type": room_type.name if room_type else "Standard" 
            },
            "competitors": {}
        }
        
        for comp in competitors:
            # Find latest rate for this date
            rate_query = select(CompetitorRate).where(
                CompetitorRate.competitor_id == comp.id,
                CompetitorRate.check_in_date == d
            ).order_by(desc(CompetitorRate.fetched_at))
            
            rate_res = await session.execute(rate_query)
            rate = rate_res.scalars().first()
            
            if rate:
                day_chart[comp.name] = rate.price
                day_table["competitors"][comp.name] = {
                    "price": rate.price,
                    "room_type": rate.room_type,
                    "is_sold_out": rate.is_sold_out,
                    "source": comp.source,
                    "url": comp.url
                }
        
        chart_data.append(day_chart)
        table_data.append(day_table)
        
    return {
        "chart_data": chart_data,
        "table_data": table_data,
        "competitors": [c.name for c in competitors]
    }
from app.schemas.rate_ingest import RateIngestRequest
from datetime import datetime

@router.post("/rates/ingest", response_model=dict)
async def ingest_competitor_rates(
    payload: RateIngestRequest,
    session: DbSession,
    # Removed strict Auth dependency to allow Extension to post without token
    # current_user: User = Depends(deps.get_current_active_user) 
):
    """
    Ingest rates from Chrome Extension (No Auth required for Localhost MVP).
    """
    count = 0
    # Dummy user or system check? 
    # Since we are using IDs, we can just upsert.
    # Security Warning: This allows anyone with the ID to post rates. Acceptable for local dev.
    
    for item in payload.rates:
        # Verify Competitor Exists
        comp = await session.get(Competitor, item.competitor_id)
        if not comp:
            continue

        # Upsert Rate (Same logic as before)
        stmt = select(CompetitorRate).where(
            CompetitorRate.competitor_id == item.competitor_id,
            CompetitorRate.check_in_date == item.check_in_date
        )
        existing_rate = (await session.execute(stmt)).scalars().first()
        
        if existing_rate:
            existing_rate.price = item.price
            existing_rate.is_sold_out = item.is_sold_out
            existing_rate.room_type = item.room_type
            existing_rate.fetched_at = datetime.utcnow() # Update timestamp
            session.add(existing_rate)
        else:
            new_rate = CompetitorRate(
                competitor_id=item.competitor_id,
                check_in_date=item.check_in_date,
                price=item.price,
                is_sold_out=item.is_sold_out,
                room_type=item.room_type,
                currency=item.currency,
                fetched_at=datetime.utcnow()
            )
            session.add(new_rate)
        count += 1
    
    await session.commit()
    return {"message": f"Successfully ingested {count} rates", "status": "success"}
