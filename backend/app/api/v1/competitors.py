from typing import List, Any, Dict, Optional
from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks, Query
from sqlmodel import select, desc, func
from sqlalchemy import tuple_
from datetime import date, timedelta, datetime
import json
from pydantic import BaseModel

from app.api.deps import CurrentUser, DbSession
from app.models.competitor import Competitor, CompetitorRate, CompetitorSource
from app.models.hotel import Hotel
from app.models.room import RoomType
from app.models.rates import RoomRate
from app.core.redis_client import redis_client
from app.core.database import async_session
from app.schemas.rate_ingest import RateIngestRequest

router = APIRouter(prefix="/competitors", tags=["Competitor Rates"])

@router.get("", response_model=List[Competitor])
async def list_competitors(current_user: CurrentUser, session: DbSession):
    """List all competitors for current hotel"""
    query = select(Competitor).where(Competitor.hotel_id == current_user.hotel_id)
    result = await session.execute(query)
    return result.scalars().all()

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
    
    return comp_data

@router.post("/{comp_id}/scrape")
async def trigger_scrape(comp_id: str, current_user: CurrentUser, session: DbSession, background_tasks: BackgroundTasks):
    """Manually trigger a scrape"""
    background_tasks.add_task(run_background_scrape, comp_id)
    return {"message": "Scrape started in background"}

async def run_background_scrape(comp_id: str):
    """Wrapper to run scrape in its own DB session"""
    print(f"Starting Background Scrape for {comp_id}")
    try:
        # Placeholder for actual scraping logic if needed in future
        pass
    except Exception as e:
        print(f"Background Scrape CRASHED for {comp_id}: {e}")

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

# --- Market Analysis ---

class MarketAnalysisResult(BaseModel):
    date: str
    my_price: float
    lowest_market_price: float
    average_market_price: float
    highest_market_price: float
    market_position: str # "Premium", "Budget", "Average"
    suggestion: str

@router.get("/analysis", response_model=List[MarketAnalysisResult])
async def get_market_analysis(
    current_user: CurrentUser,
    session: DbSession,
    days: int = 7,
    start_date: date = None
):
    """
    Analyzes market rates for the next N days.
    Returns comparison metrics and suggestions.
    """
    today = start_date if start_date else date.today()
    end_date = today + timedelta(days=days)

    # 1. Fetch My Rates (First Room Type)
    rt_query = select(RoomType).where(RoomType.hotel_id == current_user.hotel_id)
    rt_res = await session.execute(rt_query)
    room_type = rt_res.scalars().first()

    if not room_type:
        return []

    # Get my rates map
    my_rates_map = {}
    base_price = room_type.base_price
    # Default to base price
    for i in range(days):
        d = today + timedelta(days=i)
        my_rates_map[d] = base_price

    # 2. Fetch Competitor Rates in Range
    # Get all competitors for this hotel
    comp_ids_result = await session.execute(select(Competitor.id).where(Competitor.hotel_id == current_user.hotel_id))
    comp_ids = comp_ids_result.scalars().all()
    
    if not comp_ids:
        # No competitors
        all_rates = []
    else:
        rate_query = select(CompetitorRate).where(
            CompetitorRate.competitor_id.in_(comp_ids),
            CompetitorRate.check_in_date >= today,
            CompetitorRate.check_in_date < end_date
        )
        rates_res = await session.execute(rate_query)
        all_rates = rates_res.scalars().all()

    # Group by date
    rates_by_date = {}
    for r in all_rates:
        if r.check_in_date not in rates_by_date:
            rates_by_date[r.check_in_date] = []
        rates_by_date[r.check_in_date].append(r.price)

    # 3. Analyze
    results = []
    for i in range(days):
        d = today + timedelta(days=i)
        my_price = my_rates_map.get(d, 0)
        market_prices = rates_by_date.get(d, [])

        if not market_prices:
            # No data
            results.append({
                "date": d.isoformat(),
                "my_price": my_price,
                "lowest_market_price": 0,
                "average_market_price": 0,
                "highest_market_price": 0,
                "market_position": "Unknown",
                "suggestion": "No competitor data available. Check Chrome Extension."
            })
            continue

        lowest = min(market_prices)
        highest = max(market_prices)
        avg = sum(market_prices) / len(market_prices)

        # Position Logic
        if my_price > avg * 1.1:
            position = "Premium"
            suggestion = "Price is significantly higher than market average. Consider lowering if occupancy is low."
        elif my_price < avg * 0.9:
            position = "Budget"
            suggestion = "Price is lower than market. Opportunity to increase rate."
        else:
            position = "Average"
            suggestion = "Price is competitive with market average."

        results.append({
            "date": d.isoformat(),
            "my_price": my_price,
            "lowest_market_price": lowest,
            "average_market_price": int(avg),
            "highest_market_price": highest,
            "market_position": position,
            "suggestion": suggestion
        })

    return results


@router.get("/rates/comparison")
async def get_rate_comparison(current_user: CurrentUser, session: DbSession, start_date: date = None):
    """
    Get data for chart: My Rate vs Competitors for next 7 days.
    """
    today = start_date if start_date else date.today()
    end_date = today + timedelta(days=7)
    
    # 1. Fetch My Rates
    rt_query = select(RoomType).where(RoomType.hotel_id == current_user.hotel_id)
    rt_res = await session.execute(rt_query)
    room_type = rt_res.scalars().first()
    
    my_rates_map = {}
    if room_type:
        base_price = room_type.base_price
        for i in range(7):
            d = today + timedelta(days=i)
            my_rates_map[d] = base_price
            
    # 2. Fetch Competitor Rates
    comp_query = select(Competitor).where(Competitor.hotel_id == current_user.hotel_id)
    comp_res = await session.execute(comp_query)
    competitors = comp_res.scalars().all()
    
    chart_data = [] 
    table_data = []
    
    for i in range(7):
        d = today + timedelta(days=i)
        date_str = d.strftime("%d %b")
        
        day_chart = {
            "date": date_str,
            "My Hotel": my_rates_map.get(d, 0)
        }
        
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

@router.post("/rates/ingest", response_model=dict)
async def ingest_competitor_rates(
    payload: RateIngestRequest,
    session: DbSession,
    current_user: CurrentUser
):
    """
    Ingest rates from Chrome Extension (Authenticated).
    """
    if not payload.rates:
        return {"message": "No rates provided", "status": "warning"}

    comp_ids = {item.competitor_id for item in payload.rates}
    
    comp_query = select(Competitor.id).where(
        Competitor.id.in_(comp_ids),
        Competitor.hotel_id == current_user.hotel_id
    )
    valid_comp_ids = (await session.execute(comp_query)).scalars().all()
    valid_comp_ids = set(valid_comp_ids)

    if not valid_comp_ids:
        return {"message": "No valid competitors found for this user", "status": "warning"}

    valid_rates_payload = [r for r in payload.rates if r.competitor_id in valid_comp_ids]

    if not valid_rates_payload:
         return {"message": "No valid rates to ingest", "status": "warning"}

    keys = [(r.competitor_id, r.check_in_date) for r in valid_rates_payload]

    existing_rates_query = select(CompetitorRate).where(
        tuple_(CompetitorRate.competitor_id, CompetitorRate.check_in_date).in_(keys)
    )
    existing_rates_result = await session.execute(existing_rates_query)
    existing_rates = existing_rates_result.scalars().all()

    existing_map = {(r.competitor_id, r.check_in_date): r for r in existing_rates}

    count_new = 0
    count_update = 0

    for item in valid_rates_payload:
        key = (item.competitor_id, item.check_in_date)
        
        if key in existing_map:
            rate_obj = existing_map[key]
            rate_obj.price = item.price
            rate_obj.is_sold_out = item.is_sold_out
            rate_obj.room_type = item.room_type
            rate_obj.fetched_at = datetime.utcnow()
            session.add(rate_obj)
            count_update += 1
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
            count_new += 1
            
    try:
        r = redis_client.get_instance()
        pipe = r.pipeline()
        for item in valid_rates_payload:
            key = f"rate:{item.competitor_id}:{item.check_in_date.isoformat()}"
            pipe.setex(key, 3600, "1")
        pipe.execute()
    except Exception as e:
         print(f"Redis Write Failed: {e}")

    await session.commit()

    return {
        "message": f"Processed {len(valid_rates_payload)} rates (New: {count_new}, Updated: {count_update})",
        "status": "success"
    }

class ScrapeJobItem(BaseModel):
    competitor_id: str
    check_in_date: date

class CheckFreshnessResponse(BaseModel):
    jobs_to_scrape: List[ScrapeJobItem]
    cached_count: int

@router.post("/check_freshness", response_model=CheckFreshnessResponse)
async def check_scrape_freshness(jobs: List[ScrapeJobItem]):
    to_scrape = []
    cached_hits = 0
    
    redis = redis_client.get_instance()
    
    pipe = redis.pipeline()
    keys = []
    
    for job in jobs:
        key = f"rate:{job.competitor_id}:{job.check_in_date.isoformat()}"
        keys.append(key)
        pipe.exists(key)
        
    results = pipe.execute()
    
    for i, exists in enumerate(results):
        if exists:
            cached_hits += 1
        else:
            to_scrape.append(jobs[i])
            
    return {"jobs_to_scrape": to_scrape, "cached_count": cached_hits}
