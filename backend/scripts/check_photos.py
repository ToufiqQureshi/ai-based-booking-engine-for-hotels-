import asyncio
import os
import sys

# Add backend directory to python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)

from sqlmodel import select
from app.core.database import async_session
from app.models.room import RoomType

async def check():
    async with async_session() as session:
        result = await session.execute(select(RoomType))
        rooms = result.scalars().all()
        for room in rooms:
            print(f"Room: {room.name}")
            print(f"Photos: {room.photos}")
            print("-" * 20)

if __name__ == "__main__":
    asyncio.run(check())
