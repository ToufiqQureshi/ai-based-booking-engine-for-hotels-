import asyncio
from sqlalchemy import text
from app.core.database import engine

async def main():
    async with engine.connect() as conn:
        print("Checking indexes for 'competitor_rate'...")
        res = await conn.execute(text("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'competitor_rate'"))
        indexes = res.fetchall()
        if not indexes:
            print("NO INDEXES FOUND!")
        else:
            for idx in indexes:
                print(f"- {idx[0]}: {idx[1]}")

if __name__ == "__main__":
    asyncio.run(main())
