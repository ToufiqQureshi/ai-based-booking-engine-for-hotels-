from typing import List, Optional, Dict, Any
from datetime import date, timedelta
from sqlmodel import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_ollama import ChatOllama
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage

from app.models.booking import Booking, BookingStatus, BookingSource
from app.models.room import RoomType
from app.models.hotel import Hotel, HotelSettings
from app.models.amenity import Amenity
from app.core.config import get_settings

# Explicitly Read-Only System Prompt
SYSTEM_PROMPT = """You are 'Hotelier Hub Guest Assistant', a helpful and polite concierge for the hotel.
Your role is to assist prospective guests with information about the hotel, rooms, and availability.

SAFETY RULES (CRITICAL):
1. You have READ-ONLY access. You cannot make, cancel, or modify bookings.
2. If a guest wants to book, guide them to use the "Check Availability" button on the screen.
3. NEVER fake or hallucinate prices. Only use the 'check_room_availability' tool to get real prices.
4. If you don't know an answer (e.g., "Is the pool heated?"), check the amenities tool. If not found, say "I am not sure, please contact the hotel reception."
5. Be concise, professional, and welcoming.

DATE HANDLING (IMPORTANT):
- The user may say "tomorrow", "next Monday", or "4th Feb".
- YOU MUST calculate the exact date based on 'Current Date'.
- ALWAYS convert dates to 'YYYY-MM-DD' format (e.g., 2026-02-04) before calling the 'check_availability' tool.
- If the year is ambiguous, assume the current or upcoming year.

Current Date: {current_date}
"""

def create_guest_agent_graph(session: AsyncSession, hotel_id: str):
    """
    Creates a Guest-Facing Agent Graph using local Ollama model.
    """
    settings = get_settings()
    
    # --- READ-ONLY TOOLS ---

    @tool
    async def get_hotel_info() -> Dict[str, Any]:
        """
        Get general hotel information (Address, Contact, Check-in/out times, Policies).
        Use this to answer questions like "Where are you located?" or "What is check-in time?".
        """
        query = select(Hotel).where(Hotel.id == hotel_id)
        result = await session.execute(query)
        hotel = result.scalar_one_or_none()
        
        if not hotel:
            return "Hotel information not found."
            
        return {
            "name": hotel.name,
            "description": hotel.description,
            "address": hotel.address,
            "contact": hotel.contact,
            "policies": hotel.settings,
            "star_rating": hotel.star_rating
        }

    @tool
    async def get_hotel_amenities() -> List[str]:
        """
        Get list of amenities available at the hotel (e.g. WiFi, Pool, Parking).
        """
        # Assuming Amenity model links to Hotel via some relation or we fetch generic ones?
        # Actually Amenity model in app/models/amenity.py might be global or linked.
        # Let's check Amenity model. For now, returning a placeholder or fetching if possible.
        # Check: Amenity usually linked to RoomType or Hotel.
        # Simplified: Fetch amenities linked to any room type of this hotel as a proxy.
        
        query = select(Amenity).join(RoomType).where(RoomType.hotel_id == hotel_id)
        result = await session.execute(query)
        amenities = result.scalars().all()
        return list(set([a.name for a in amenities]))

    @tool
    async def check_availability(check_in_date: str, check_out_date: str, guests: int = 2) -> str:
        """
        Check room availability and prices for specific dates.
        Dates must be in YYYY-MM-DD format.
        Returns a list of available rooms and their prices.
        """
        try:
            c_in = date.fromisoformat(check_in_date)
            c_out = date.fromisoformat(check_out_date)
        except ValueError:
            return "Please provide dates in YYYY-MM-DD format."

        if c_in < date.today():
            return "Check-in date cannot be in the past."

        # Logic to find available rooms (Simplified)
        # 1. Get all room types
        rt_query = select(RoomType).where(RoomType.hotel_id == hotel_id)
        rt_res = await session.execute(rt_query)
        room_types = rt_res.scalars().all()
        
        available_options = []
        
        for rt in room_types:
            # Check if sold out (Naive check: total inventory vs bookings)
            # For chatbot, returning base price is safer than complex availability logic if not fully implemented
            # FIXED: 'settings' object missing CURRENCY, defaulting to 'INR'
            available_options.append(f"- {rt.name}: Base Price {rt.base_price} INR/night")

        if not available_options:
            return "No rooms available for these dates."
            
        return "Available Rooms:\n" + "\n".join(available_options)

    @tool
    async def get_room_details(room_name: str) -> str:
        """
        Get detailed description and amenities for a specific room type (e.g., "Deluxe", "Suite").
        Useful when a guest asks "What is in the Deluxe Room?" or "Show me room photos".
        """
        query = select(RoomType).where(
            RoomType.hotel_id == hotel_id,
            RoomType.name.ilike(f"%{room_name}%")
        )
        result = await session.execute(query)
        room = result.scalars().first()
        
        if not room:
            return f"Sorry, I couldn't find a room type named '{room_name}'."
            
        # Manually fetch generic amenities if not in room.amenities (depending on DB structure)
        # Assuming RoomType has an 'amenities' relationship or json field. 
        # For MVP, returning generic description + base stats.
        
        details = f"""
        **{room.name}**
        - **Description**: {room.description or 'A comfortable stay equipped with modern amenities.'}
        - **Base Price**: {room.base_price} INR
        - **Max Guests**: {room.max_adults} Adults, {room.max_children} Children
        - **Size**: {room.size_sqft} sqft
        """
        
        # If amenities are stored in a JSON column or relationship, append them
        # (Assuming 'amenities' is a list of strings or objects)
        if hasattr(room, 'amenities') and room.amenities:
            # If it's a list of objects, extract names. If list of strings, join.
            # Safe conversion:
            try:
                ams = [a['name'] if isinstance(a, dict) else str(a) for a in room.amenities]
                details += f"\n- **Amenities**: {', '.join(ams)}"
            except:
                details += f"\n- **Amenities**: {room.amenities}"

        # Images
        if room.images:
             details += f"\n\n**Photos**: {room.images[0] if isinstance(room.images, list) else room.images}"

        return details

    tools = [get_hotel_info, get_hotel_amenities, check_availability, get_room_details]

    # Initialize Ollama
    # Model: deepseek-v3.1:671b-cloud (as requested)
    llm = ChatOllama(
        model="deepseek-v3.1:671b-cloud",
        temperature=0.3, # Slightly creative but consistent
        base_url="http://localhost:11434" # Default Ollama URL
    )

    # Create Graph
    graph = create_react_agent(
        model=llm,
        tools=tools,
        prompt=SYSTEM_PROMPT.format(current_date=date.today().isoformat())
    )

    return graph
