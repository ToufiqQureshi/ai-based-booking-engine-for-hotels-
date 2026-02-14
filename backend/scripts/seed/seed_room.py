
import sys
import os
import asyncio
import uuid

# Add backend to path BEFORE imports
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

import logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

from app.core.database import get_session
from app.models.room import RoomType
from app.models.hotel import Hotel

HOTEL_ID = "64464114-f6c5-4195-8eca-5db821b80611" # Dwarka hotel

async def main():
    async for session in get_session():
        # Check if hotel exists
        hotel = await session.get(Hotel, HOTEL_ID)
        if not hotel:
            print("Hotel not found!")
            return

        print(f"Adding room to {hotel.name}...")
        
        room = RoomType(
            hotel_id=HOTEL_ID,
            name="Super Deluxe Room",
            description="A very fancy room with sea view",
            base_occupancy=2,
            max_occupancy=3,
            base_price=5000.0,
            total_inventory=5,
            is_active=True,
            amenities=[{"name": "WiFi"}, {"name": "AC"}],
            photos=[{"url": "https://placehold.co/600x400"}]
        )
        
        session.add(room)
        await session.commit()
        await session.refresh(room)
        print(f"Created Room: {room.name} (ID: {room.id})")
        break

if __name__ == "__main__":
    asyncio.run(main())
