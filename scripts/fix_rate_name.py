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

async def fix_name():
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found")
        return

    engine = create_async_engine(DATABASE_URL)

    async with engine.begin() as conn:
        print("Renaming 'Toufiq Qureshi' to 'Standard Rate'...")
        await conn.execute(text("UPDATE rate_plans SET name = 'Standard Rate' WHERE name = 'Toufiq Qureshi'"))
        print("Done.")

    await engine.dispose()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(fix_name())
