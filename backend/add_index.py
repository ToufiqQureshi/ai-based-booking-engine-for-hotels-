import asyncio
from sqlalchemy import text
from app.core.database import engine

async def main():
    # Use standard connect as AsyncEngine.begin() can be tricky with some drivers/DDL
    async with engine.connect() as conn:
        print("Creating index 'idx_competitor_rate_lookup' on competitor_rate(competitor_id, check_in_date)...")
        try:
            # Commit any open trans first
            await conn.commit()
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_competitor_rate_lookup ON competitor_rate (competitor_id, check_in_date)"))
            print("Index created successfully!")
        except Exception as e:
            print(f"Error creating index: {e}")

if __name__ == "__main__":
    asyncio.run(main())
