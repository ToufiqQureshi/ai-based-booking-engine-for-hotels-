"""
Dashboard Router
Dashboard stats aur reports ke liye.
"""
from datetime import datetime, date, timedelta
from fastapi import APIRouter
from sqlmodel import select, func

from app.api.deps import CurrentUser, DbSession
from app.models.booking import Booking, BookingStatus
from app.models.room import RoomType

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
async def get_dashboard_stats(current_user: CurrentUser, session: DbSession):
    """
    Dashboard ke liye summary stats.
    Frontend DashboardStats interface se match karta hai.
    """
    today = date.today()
    
    # Today's arrivals (check-ins)
    arrivals_result = await session.execute(
        select(func.count(Booking.id)).where(
            Booking.hotel_id == current_user.hotel_id,
            Booking.check_in == today,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING])
        )
    )
    today_arrivals = arrivals_result.scalar() or 0
    
    # Today's departures (check-outs)
    departures_result = await session.execute(
        select(func.count(Booking.id)).where(
            Booking.hotel_id == current_user.hotel_id,
            Booking.check_out == today,
            Booking.status == BookingStatus.CHECKED_IN
        )
    )
    today_departures = departures_result.scalar() or 0
    
    # Currently checked in (occupancy)
    occupancy_result = await session.execute(
        select(func.count(Booking.id)).where(
            Booking.hotel_id == current_user.hotel_id,
            Booking.status == BookingStatus.CHECKED_IN
        )
    )
    current_occupancy = occupancy_result.scalar() or 0
    
    # Today's revenue (bookings created today)
    revenue_result = await session.execute(
        select(func.sum(Booking.total_amount)).where(
            Booking.hotel_id == current_user.hotel_id,
            func.date(Booking.created_at) == today
        )
    )
    today_revenue = revenue_result.scalar() or 0
    
    # Pending bookings
    pending_result = await session.execute(
        select(func.count(Booking.id)).where(
            Booking.hotel_id == current_user.hotel_id,
            Booking.status == BookingStatus.PENDING
        )
    )
    pending_bookings = pending_result.scalar() or 0
    
    # Total rooms
    rooms_result = await session.execute(
        select(func.sum(RoomType.total_inventory)).where(
            RoomType.hotel_id == current_user.hotel_id,
            RoomType.is_active == True
        )
    )
    total_rooms = rooms_result.scalar() or 0
    
    return {
        "today_arrivals": today_arrivals,
        "today_departures": today_departures,
        "current_occupancy": current_occupancy,
        "today_revenue": float(today_revenue),
        "pending_bookings": pending_bookings,
        "total_rooms": total_rooms
    }


@router.get("/recent-bookings")
async def get_recent_bookings(current_user: CurrentUser, session: DbSession):
    """Recent 5 bookings for dashboard"""
    from app.models.booking import Guest
    
    # Optimized query using JOIN
    from app.models.booking import Guest
    
    result = await session.execute(
        select(Booking, Guest)
        .join(Guest, Booking.guest_id == Guest.id)
        .where(Booking.hotel_id == current_user.hotel_id)
        .order_by(Booking.created_at.desc())
        .limit(5)
    )
    rows = result.all()
    
    response = []
    for booking, guest in rows:
        booking_dict = booking.model_dump()
        booking_dict["guest"] = guest.model_dump()
        response.append(booking_dict)
    
    return response
