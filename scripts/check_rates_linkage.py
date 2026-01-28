import asyncio
import os
import sys

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

# Load env from backend/.env
backend_env = os.path.join(os.path.dirname(__file__), "../backend/.env")
load_dotenv(backend_env)

DATABASE_URL = os.getenv("DATABASE_URL")

async def check_data():
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found")
        return

    engine = create_async_engine(DATABASE_URL)

    async with engine.begin() as conn:
        print("\n--- Hotels ---")
        h_res = await conn.execute(text("SELECT id, name, slug FROM hotels"))
        hotels = h_res.fetchall()
        for h in hotels:
            print(f"Hotel: {h.name} (ID: {h.id}) Slug: {h.slug}")

        print("\n--- Rate Plans ---")
        # Ensure we select hotel_id
        result = await conn.execute(text("SELECT id, name, is_active, hotel_id FROM rate_plans"))
        plans = result.fetchall()
        if not plans:
             print("NO RATE PLANS FOUND!")
        else:
             for p in plans:
                 print(f"Plan: {p.name} (HotelID: {p.hotel_id}) Active: {p.is_active}")

    await engine.dispose()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check_data())
