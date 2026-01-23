
import asyncio
import sys
import os

# Add backend to path BEFORE imports
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.core.database import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        # Drop bookings table
        await conn.execute(text("DROP TABLE IF EXISTS bookings"))
        print("Dropped table 'bookings'.")

if __name__ == "__main__":
    asyncio.run(main())
