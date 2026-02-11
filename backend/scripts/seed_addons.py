
import sys
import os
import asyncio

# Add backend to path BEFORE imports
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

import logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

from app.core.database import get_session
from app.models.addon import AddOn
from app.models.hotel import Hotel
from sqlmodel import select

# Use the ID we know from previous steps or dynamic fetch
HOTEL_SLUG = "dwarka-hotel" 

async def main():
    async for session in get_session():
        # Find Hotel
        query = select(Hotel).where(Hotel.slug == HOTEL_SLUG)
        result = await session.execute(query)
        hotel = result.scalar_one_or_none()
        
        if not hotel:
            print(f"Hotel '{HOTEL_SLUG}' not found!")
            return

        print(f"Seeding addons for {hotel.name}...")
        
        addons_data = [
            {
                "name": "Airport Transfer",
                "description": "Private car pickup from airport to hotel.",
                "price": 1500.0,
                "category": "transport",
                "image_url": "https://placehold.co/100x100?text=Car"
            },
            {
                "name": "Candlelight Dinner",
                "description": "Romantic 3-course dinner by the pool.",
                "price": 3500.0,
                "category": "romance",
                "image_url": "https://placehold.co/100x100?text=Dinner"
            },
            {
                "name": "Spa Package (Couple)",
                "description": "60-minute full body massage for two.",
                "price": 5000.0,
                "category": "wellness",
                "image_url": "https://placehold.co/100x100?text=Spa"
            },
             {
                "name": "Room Decoration",
                "description": "Flower petals and chocolate box on arrival.",
                "price": 1200.0,
                "category": "romance",
                "image_url": "https://placehold.co/100x100?text=Decor"
            },
             {
                "name": "Fruit Basket",
                "description": "Seasonal fruit basket in your room.",
                "price": 500.0,
                "category": "food",
                "image_url": "https://placehold.co/100x100?text=Fruit"
            }
        ]
        
        for data in addons_data:
            addon = AddOn(hotel_id=hotel.id, **data)
            session.add(addon)
            print(f" - Added: {addon.name}")
            
        await session.commit()
        print("Addons seeded successfully!")
        break

if __name__ == "__main__":
    asyncio.run(main())
