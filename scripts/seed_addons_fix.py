
import sys
import os
import asyncio
from pathlib import Path

# Add backend to path (Copied logic from run_server.py/main.py pattern)
# backend/ is one level down from root, but we are in scripts/ which is also one level down
# So we need to go up one level to root, then down to backend
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.append(str(BACKEND_DIR))

from sqlmodel import select
from app.core.database import get_session_context
from app.models.hotel import Hotel
from app.models.addon import AddOn

TARGET_HOTEL_ID = "1db2d596-fffc-471c-bb6f-99a18b26330e"

async def seed_data():
    async with get_session_context() as session:
        print(f"Checking Hotel ID: {TARGET_HOTEL_ID}")
        hotel = await session.get(Hotel, TARGET_HOTEL_ID)

        if not hotel:
            print("❌ Target Hotel not found! Creating it as fallback...")
            # Create dummy hotel if missing (should not happen based on logs)
            hotel = Hotel(
                id=TARGET_HOTEL_ID,
                name="Dwarka Hotel (Restored)",
                slug="dwarka-hotel",
                address="Dwarka",
                city="Dwarka",
                state="Gujarat",
                country="India",
                zip_code="361335",
                currency="INR",
                email="info@dwarka.com",
                phone="+919999999999"
            )
            session.add(hotel)
            await session.flush()
        else:
            print(f"✅ Found Hotel: {hotel.name} ({hotel.slug})")

        # Check existing addons
        result = await session.execute(select(AddOn).where(AddOn.hotel_id == TARGET_HOTEL_ID))
        existing = result.scalars().all()

        if existing:
            print(f"ℹ️  Found {len(existing)} existing add-ons.")
            for ex in existing:
                print(f"   - {ex.name} (${ex.price})")

        if len(existing) == 0:
            print("⚠️  No add-ons found. Seeding now...")
            addons_data = [
                {
                    "name": "Airport Transfer",
                    "description": "Private luxury car pickup from airport.",
                    "price": 1500.00,
                    "category": "Transport",
                    "is_active": True,
                    "hotel_id": TARGET_HOTEL_ID
                },
                {
                    "name": "Candlelight Dinner",
                    "description": "Romantic 3-course dinner at rooftop.",
                    "price": 3500.00,
                    "category": "Dining",
                    "is_active": True,
                    "hotel_id": TARGET_HOTEL_ID
                },
                {
                    "name": "Spa Session (60 mins)",
                    "description": "Relaxing full body massage.",
                    "price": 2500.00,
                    "category": "Wellness",
                    "is_active": True,
                    "hotel_id": TARGET_HOTEL_ID
                },
                 {
                    "name": "City Tour",
                    "description": "Guided tour of Dwarka temples.",
                    "price": 1200.00,
                    "category": "Activity",
                    "is_active": True,
                    "hotel_id": TARGET_HOTEL_ID
                }
            ]

            for data in addons_data:
                addon = AddOn(**data)
                session.add(addon)

            await session.commit()
            print("✅ Successfully seeded 4 add-ons!")
        else:
            print("✅ Add-ons already exist. No action needed.")

if __name__ == "__main__":
    asyncio.run(seed_data())
