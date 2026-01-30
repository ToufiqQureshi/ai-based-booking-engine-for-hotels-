import asyncio
from sqlmodel import SQLModel
from app.core.database import engine
# Import all models to ensure metadata is populated
from app.models.user import User
from app.models.hotel import Hotel
from app.models.review import Review

async def create_reviews_table():
    async with engine.begin() as conn:
        print("Creating reviews table...")
        await conn.run_sync(SQLModel.metadata.create_all)
        print("Reviews table created successfully.")

if __name__ == "__main__":
    asyncio.run(create_reviews_table())
