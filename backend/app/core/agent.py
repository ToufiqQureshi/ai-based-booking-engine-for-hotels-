from typing import List, Optional, Dict, Any
from datetime import date, timedelta, datetime
from sqlmodel import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage

from app.core.config import get_settings
from app.models.booking import Booking, BookingStatus, BookingSource
from app.models.room import RoomType
from app.models.user import User

# System Prompt specialized for Hotelier Hub
SYSTEM_PROMPT = """You are 'Hotelier Hub AI', an intelligent assistant for hotel owners.
Your goal is to help the hotelier grow their business, analyze reports, and execute tasks.
You speak in Hinglish (Hindi + English mix) or English as per the user's preference. Be professional yet friendly.

You have access to the hotel's live data. Use the available tools to fetch information.
Always analyze the data before giving advice.
For example, if occupancy is low, suggest lowering prices or running a promo.

If asked to perform a critical action like cancelling a booking, ALWAYS ask for confirmation first if the user hasn't explicitly confirmed it in the prompt.
However, since you are an API agent, if the tool is called, assume the user intends to do it, but you can phrase your response to confirm what was done.

Current Date: {current_date}
"""

def create_agent_executor(session: AsyncSession, user: User):
    """
    Creates an Agent Graph instance with tools bound to the current user and database session.
    """
    settings = get_settings()
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not set in configuration.")

    # --- TOOLS ---

    @tool
    async def get_dashboard_stats(days: int = 30) -> Dict[str, Any]:
        """
        Get consolidated dashboard stats (Revenue, Occupancy, Bookings) for the last N days.
        Useful for growth analysis and performance review.
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=days)

        # 1. Fetch relevant bookings
        query = select(Booking).where(
            Booking.hotel_id == user.hotel_id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT]),
            Booking.check_in >= start_date,
            Booking.check_in <= end_date
        )
        result = await session.execute(query)
        bookings = result.scalars().all()

        total_revenue = sum(b.total_amount for b in bookings)
        total_bookings = len(bookings)

        # Inventory for occupancy
        inventory_result = await session.execute(
            select(func.sum(RoomType.total_inventory)).where(RoomType.hotel_id == user.hotel_id)
        )
        total_inventory = inventory_result.scalar() or 0

        # Calculate approximate occupancy
        occupancy_rate = 0
        if total_inventory > 0 and days > 0:
            total_capacity = total_inventory * days
            occupied_nights = 0
            for b in bookings:
                nights = (min(b.check_out, end_date) - max(b.check_in, start_date)).days
                if nights > 0:
                    occupied_nights += nights * len(b.rooms)

            occupancy_rate = int((occupied_nights / total_capacity) * 100)

        return {
            "period": f"Last {days} days",
            "total_revenue": total_revenue,
            "total_bookings": total_bookings,
            "occupancy_rate": f"{occupancy_rate}%",
            "net_profit_est": total_revenue * 0.7
        }

    @tool
    async def search_bookings(query_str: str) -> List[Dict[str, Any]]:
        """
        Search for bookings by Guest Name (first or last) or Booking Number.
        Returns a list of matching bookings with details.
        """
        from app.models.booking import Guest

        results = []

        # 1. Search by Booking Number
        q_num = select(Booking).where(
            Booking.hotel_id == user.hotel_id,
            Booking.booking_number.ilike(f"%{query_str}%")
        )
        res_num = await session.execute(q_num)
        bookings_num = res_num.scalars().all()
        results.extend(bookings_num)

        # 2. Search by Guest Name
        q_name = select(Booking).join(Guest).where(
            Booking.hotel_id == user.hotel_id,
            (Guest.first_name.ilike(f"%{query_str}%")) | (Guest.last_name.ilike(f"%{query_str}%"))
        )
        res_name = await session.execute(q_name)
        bookings_name = res_name.scalars().all()

        # Deduplicate
        seen = set()
        unique_results = []
        for b in results + bookings_name:
            if b.id not in seen:
                seen.add(b.id)
                unique_results.append(b)

        formatted = []
        for b in unique_results:
            formatted.append({
                "booking_number": b.booking_number,
                "status": b.status,
                "check_in": b.check_in.isoformat(),
                "check_out": b.check_out.isoformat(),
                "amount": b.total_amount,
                "guest_id": b.guest_id
            })
        return formatted

    @tool
    async def get_booking_details(booking_number: str) -> str:
        """
        Get full details of a specific booking including guest info.
        """
        query = select(Booking).where(
            Booking.hotel_id == user.hotel_id,
            Booking.booking_number == booking_number
        )
        result = await session.execute(query)
        booking = result.scalar_one_or_none()
        if not booking:
            return "Booking not found."

        from app.models.booking import Guest
        guest_res = await session.execute(select(Guest).where(Guest.id == booking.guest_id))
        guest = guest_res.scalar_one_or_none()

        details = f"""
        Booking: {booking.booking_number}
        Guest: {guest.first_name if guest else 'Unknown'} {guest.last_name if guest else ''}
        Status: {booking.status}
        Dates: {booking.check_in} to {booking.check_out}
        Amount: {booking.total_amount}
        Rooms: {booking.rooms}
        """
        return details

    @tool
    async def cancel_booking(booking_number: str) -> str:
        """
        Cancels a booking with the given booking number.
        WARNING: This action cannot be undone easily.
        """
        query = select(Booking).where(
            Booking.hotel_id == user.hotel_id,
            Booking.booking_number == booking_number
        )
        result = await session.execute(query)
        booking = result.scalar_one_or_none()

        if not booking:
            return f"Booking {booking_number} not found."

        if booking.status == BookingStatus.CANCELLED:
            return f"Booking {booking_number} is already cancelled."

        booking.status = BookingStatus.CANCELLED
        session.add(booking)
        await session.commit()
        await session.refresh(booking)

        return f"Booking {booking_number} has been successfully cancelled."

    # --- AGENT SETUP ---

    tools = [get_dashboard_stats, search_bookings, get_booking_details, cancel_booking]

    llm = ChatOpenAI(
        model="gpt-4o",
        temperature=0,
        openai_api_key=settings.OPENAI_API_KEY
    )

    # Create Agent Graph (LangGraph)
    graph = create_react_agent(
        model=llm,
        tools=tools,
        prompt=SYSTEM_PROMPT.format(current_date=date.today().isoformat())
    )

    return graph
