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

async def update_schema():
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found")
        return

    print(f"Connecting to: {DATABASE_URL}")
    engine = create_async_engine(DATABASE_URL)

    async with engine.begin() as conn:
        print("Checking/Adding 'meal_plan' column to 'rate_plans' table...")
        try:
            await conn.execute(text("ALTER TABLE rate_plans ADD COLUMN meal_plan VARCHAR DEFAULT 'RO'"))
            print("Added 'meal_plan' column.")
        except Exception as e:
            if "already exists" in str(e):
                print("'meal_plan' column already exists.")
            else:
                print(f"Error adding 'meal_plan': {e}")

    await engine.dispose()
    print("Schema update completed.")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(update_schema())
