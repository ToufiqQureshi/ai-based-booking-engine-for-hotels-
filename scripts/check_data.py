
import sys
import os
import asyncio

# Add backend to path BEFORE importing app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from sqlmodel import select
from app.core.database import get_session_context
from app.models.hotel import Hotel
from app.models.addon import AddOn

async def check_data():
    async with get_session_context() as session:
        print("\n--- HOTELS ---")
        result = await session.execute(select(Hotel))
        hotels = result.scalars().all()
        for h in hotels:
            print(f"ID: {h.id} | Slug: {h.slug} | Name: {h.name}")

        print("\n--- ADD-ONS ---")
        result = await session.execute(select(AddOn))
        addons = result.scalars().all()
        for a in addons:
            print(f"ID: {a.id} | Hotel ID: {a.hotel_id} | Name: {a.name} | Active: {a.is_active}")

if __name__ == "__main__":
    asyncio.run(check_data())
