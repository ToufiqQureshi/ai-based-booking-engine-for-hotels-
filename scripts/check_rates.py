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
        print("--- Checking Rate Plans ---")
        result = await conn.execute(text("SELECT id, name, is_active, price_adjustment FROM rate_plans"))
        plans = result.fetchall()
        if not plans:
             print("NO RATE PLANS FOUND!")
        else:
             for p in plans:
                 print(f"Plan: {p.name}, Active: {p.is_active}, Adjustment: {p.price_adjustment}")

        print("\n--- Checking Rooms ---")
        result_rooms = await conn.execute(text("SELECT id, name, is_active, inventory FROM room_types"))
        rooms = result_rooms.fetchall()
        for r in rooms:
            print(f"Room: {r.name}, Active: {r.is_active}, Inventory: {r.inventory}")

    await engine.dispose()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check_data())
