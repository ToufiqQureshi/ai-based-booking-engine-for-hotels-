import asyncio
import os
import sys

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import select
from sqlalchemy.orm import sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession
from dotenv import load_dotenv

# Load env from backend/.env
backend_env = os.path.join(os.path.dirname(__file__), "../backend/.env")
load_dotenv(backend_env)

DATABASE_URL = os.getenv("DATABASE_URL")

from app.models.room import RoomType
from app.models.rates import RatePlan
from app.models.hotel import Hotel

async def check_data():
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found")
        return

    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        print("\n=== HOTEL INFO ===")
        result = await session.exec(select(Hotel))
        hotels = result.all()
        for hotel in hotels:
            print(f"Slug: {hotel.slug} | Name: {hotel.name} | ID: {hotel.id}")

        print("\n=== ROOMS INFO ===")
        result = await session.exec(select(RoomType))
        rooms = result.all()
        for room in rooms:
            print(f"Room: {room.name} | ID: {room.id} | Active: {room.is_active} | Inv: {room.total_inventory} | MaxOcc: {room.max_occupancy}")

        print("\n=== BOOKINGS INFO ===")
        from app.models.booking import Booking
        result = await session.exec(select(Booking))
        bookings = result.all()
        print(f"Total Bookings: {len(bookings)}")

    await engine.dispose()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check_data())
