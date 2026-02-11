import asyncio
from sqlalchemy import text
from app.core.database import engine

async def update():
    async with engine.begin() as conn:
        await conn.execute(text('ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_id VARCHAR UNIQUE'))
    print("Column added.")

if __name__ == "__main__":
    asyncio.run(update())
