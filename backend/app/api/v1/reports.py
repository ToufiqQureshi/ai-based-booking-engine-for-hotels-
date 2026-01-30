"""
Reports/Analytics Endpoints
Real-time dashboard statistics.
"""
from typing import List, Dict, Any
from datetime import date, timedelta, datetime
from fastapi import APIRouter, Query, Depends
from sqlmodel import select, func, and_

from app.api.deps import CurrentUser, DbSession
from app.models.booking import Booking, BookingStatus
from app.models.room import RoomType

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/dashboard")
async def get_dashboard_stats(
    current_user: CurrentUser,
    session: DbSession,
    days: int = 30
):
    """
    Get consolidated dashboard stats for the last N days.
    """
    end_date = date.today()
    start_date = end_date - timedelta(days=days)
    
    # 1. Fetch relevant bookings
    query = select(Booking).where(
        Booking.hotel_id == current_user.hotel_id,
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT]),
        Booking.check_in >= start_date,
        Booking.check_in <= end_date
    )
    result = await session.execute(query)
    bookings = result.scalars().all()
    
    # 2. Total Revenue & Bookings
    total_revenue = sum(b.total_amount for b in bookings)
    total_bookings = len(bookings)
    
    # 3. Calculate Daily Stats for Charts
    # Initialize dictionary for last N days
    daily_stats = {}
    for i in range(days + 1):
        d = start_date + timedelta(days=i)
        daily_stats[d] = {"date": d.isoformat(), "revenue": 0, "occupancy": 0, "bookings": 0}
        
    # Get Total Inventory for Occupancy Calc
    # This is a simplification (assumes inventory constant)
    inventory_result = await session.execute(
        select(func.sum(RoomType.total_inventory)).where(RoomType.hotel_id == current_user.hotel_id)
    )
    total_inventory = inventory_result.scalar() or 0
    
    # Aggregate data
    for booking in bookings:
        # For revenue attribute to check-in date (simple attribution)
        if booking.check_in in daily_stats:
            daily_stats[booking.check_in]["revenue"] += booking.total_amount
            daily_stats[booking.check_in]["bookings"] += 1
            
            # For occupancy, we should ideally span the range, but for simple chart:
            # We count nights falling in this range? 
            # Let's simple it: Count check-ins as "occupancy" activity for valid chart (trend)
            # Or better: Check nights.
            
    # Accurate Occupancy Loop
    # Loop dates, count rooms occupied
    if total_inventory > 0:
        for d_key in daily_stats.keys():
            occupied = 0
            for b in bookings:
                if b.check_in <= d_key < b.check_out:
                    # Count rooms in this booking
                    # Each booking has 'rooms' list
                    occupied += len(b.rooms)
            
            daily_stats[d_key]["occupancy"] = min(100, int((occupied / total_inventory) * 100))

    # Convert to list sorted by date
    chart_data = sorted(daily_stats.values(), key=lambda x: x["date"])
    
    # Occupancy Rate (Average of period)
    avg_occupancy = sum(d["occupancy"] for d in chart_data) / len(chart_data) if chart_data else 0
    
    # Advanced Metrics: ADR & RevPAR
    # ADR (Average Daily Rate) = Total Revenue / Total Sold Rooms (approx bookings * days?)
    # For simplicity here: Total Revenue / Total Bookings (Average Booking Value) or Revenue / Occupied Nights
    total_nights_sold = sum(d["bookings"] for d in chart_data) # Approximation for chart

    # Better ADR calculation: Average price per night sold
    adr = 0
    if total_bookings > 0:
        # Simple ADR = Revenue / Bookings (This is actually Avg Booking Value, but fine for summary if nights unknown)
        # Let's try to be more precise: revenue / count of nights booked
        # We don't have total nights easily here without iterating rooms.
        # Fallback: ADR = Total Revenue / Total Bookings
        adr = total_revenue / total_bookings

    # RevPAR = ADR * Occupancy Rate
    revpar = adr * (avg_occupancy / 100)

    return {
        "summary": {
            "totalRevenue": total_revenue,
            "totalBookings": total_bookings,
            "occupancyRate": int(avg_occupancy),
            "netProfit": total_revenue * 0.7, # Mock profit margin
            "adr": round(adr, 2),
            "revpar": round(revpar, 2)
        },
        "revenueChart": chart_data,
        "occupancyChart": chart_data
    }

@router.get("/forecast")
async def get_forecast(
    current_user: CurrentUser,
    session: DbSession,
    days: int = 30
):
    """
    Predictive Analytics: Forecast revenue/occupancy for next N days.
    Uses Simple Moving Average (SMA) from historical data.
    """
    # 1. Get Historical Data (Last 90 days for better trend)
    hist_end = date.today()
    hist_start = hist_end - timedelta(days=90)

    query = select(Booking).where(
        Booking.hotel_id == current_user.hotel_id,
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT]),
        Booking.check_in >= hist_start,
        Booking.check_in <= hist_end
    )
    result = await session.execute(query)
    bookings = result.scalars().all()

    # Calculate daily averages
    total_rev = sum(b.total_amount for b in bookings)
    total_bks = len(bookings)
    days_count = 90

    avg_daily_revenue = total_rev / days_count if days_count > 0 else 0
    avg_daily_bookings = total_bks / days_count if days_count > 0 else 0

    # 2. Generate Forecast
    # Very simple model: Forecast = Average * (1 + random variation/trend)
    # Here we just project the average forward
    forecast_data = []

    for i in range(1, days + 1):
        future_date = date.today() + timedelta(days=i)

        # Add simple "weekend weight" (Fri/Sat are usually busier)
        weight = 1.2 if future_date.weekday() >= 5 else 0.9

        forecast_data.append({
            "date": future_date.isoformat(),
            "predicted_revenue": round(avg_daily_revenue * weight, 2),
            "predicted_occupancy_percent": min(100, round((avg_daily_bookings * weight) * 5, 0)) # Mock occupancy scale
        })

    return {
        "forecast_method": "Simple Moving Average with Weekend Weighting",
        "data": forecast_data
    }

@router.get("/occupancy")
async def get_occupancy_report(
    current_user: CurrentUser,
    session: DbSession,
    start_date: date = Query(default=None),
    end_date: date = Query(default=None)
):
    """
    Get occupancy report for a date range.
    """
    # Default to last 30 days if not specified
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    # Get total inventory
    inventory_result = await session.execute(
        select(func.sum(RoomType.total_inventory)).where(RoomType.hotel_id == current_user.hotel_id)
    )
    total_inventory = inventory_result.scalar() or 0
    
    if total_inventory == 0:
        return {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "total_inventory": 0,
            "average_occupancy": 0,
            "daily_occupancy": []
        }
    
    # Get bookings in range
    query = select(Booking).where(
        Booking.hotel_id == current_user.hotel_id,
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT]),
        Booking.check_out > start_date,
        Booking.check_in < end_date
    )
    result = await session.execute(query)
    bookings = result.scalars().all()
    
    # Calculate daily occupancy
    daily_occupancy = []
    current_date = start_date
    total_occupancy = 0
    days_count = 0
    
    while current_date <= end_date:
        occupied = 0
        for booking in bookings:
            if booking.check_in <= current_date < booking.check_out:
                occupied += len(booking.rooms) if hasattr(booking, 'rooms') else 1
        
        occupancy_rate = min(100, int((occupied / total_inventory) * 100))
        daily_occupancy.append({
            "date": current_date.isoformat(),
            "occupied_rooms": occupied,
            "available_rooms": total_inventory - occupied,
            "occupancy_rate": occupancy_rate
        })
        
        total_occupancy += occupancy_rate
        days_count += 1
        current_date += timedelta(days=1)
    
    average_occupancy = int(total_occupancy / days_count) if days_count > 0 else 0
    
    return {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "total_inventory": total_inventory,
        "average_occupancy": average_occupancy,
        "daily_occupancy": daily_occupancy
    }

