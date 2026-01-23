
import sys
import os
import asyncio

# Add backend to path BEFORE imports
sys.path.append(os.path.join(os.getcwd(), "backend"))

import logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

from app.core.database import get_session
from app.models.hotel import Hotel
from app.models.room import RoomType
from sqlmodel import select, func

async def main():
    async for session in get_session():
        # Get all hotels
        hotels = (await session.execute(select(Hotel))).scalars().all()
        
        for h in hotels:
            # Count rooms for this hotel
            # room_count = await session.scalar(select(func.count(RoomType.id)).where(RoomType.hotel_id == h.id))
            # Just get rooms
            result = await session.execute(select(RoomType).where(RoomType.hotel_id == h.id))
            rooms = result.scalars().all()
            
            print(f"Hotel: {h.name} ({h.slug})")
            print(f"  - Room Types: {len(rooms)}")
            for r in rooms:
                print(f"    * {r.name} (Base Price: {r.base_price})")
        break

if __name__ == "__main__":
    asyncio.run(main())
