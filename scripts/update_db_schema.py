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
        print("Checking/Adding 'bed_type' column...")
        try:
            await conn.execute(text("ALTER TABLE room_types ADD COLUMN bed_type VARCHAR"))
            print("Added 'bed_type' column.")
        except Exception as e:
            if "already exists" in str(e):
                print("'bed_type' column already exists.")
            else:
                print(f"Error adding 'bed_type': {e}")
                
        print("Checking/Adding 'room_size' column...")
        try:
            await conn.execute(text("ALTER TABLE room_types ADD COLUMN room_size INTEGER"))
            print("Added 'room_size' column.")
        except Exception as e:
            if "already exists" in str(e):
                print("'room_size' column already exists.")
            else:
                print(f"Error adding 'room_size': {e}")

    await engine.dispose()
    print("Schema update completed.")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(update_schema())
