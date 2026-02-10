
import sys
import os
import asyncio

# Add backend to path BEFORE imports
sys.path.append(os.path.join(os.getcwd(), "backend"))

import logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

from app.core.database import get_session
from app.models.hotel import Hotel
from sqlmodel import select

async def main():
    async for session in get_session():
        query = select(Hotel)
        result = await session.execute(query)
        hotels = result.scalars().all()

        print(f"Found {len(hotels)} hotels:")
        for h in hotels:
            print(f" - Name: {h.name}, Slug: {h.slug}, ID: {h.id}")
        break  # Just need one session

if __name__ == "__main__":
    asyncio.run(main())
