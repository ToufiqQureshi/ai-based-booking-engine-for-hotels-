import asyncio
from sqlmodel import Session, select
from app.core.database import engine
from app.models.review import Review
from app.models.user import User
from app.models.hotel import Hotel
from datetime import datetime

async def seed_review():
    async with engine.begin() as conn:
        # We need a session, easier to use local session context if setup, 
        # but here we can just execute an insert or use SQLModel session with sync engine if strictly needed.
        # Since our engine is async, let's use a raw approach or proper session.
        pass

    # Re-using a simple synchronous pattern for script simplicity if possible, 
    # but app uses async. Let's try to grab the first user/hotel and insert.
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.ext.asyncio import AsyncSession
    
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        # Get a hotel
        result = await session.execute(select(Hotel))
        hotel = result.scalars().first()
        
        if not hotel:
            print("No hotel found! Please create a hotel first.")
            return

        print(f"Adding review to Hotel: {hotel.name} (ID: {hotel.id})")
        
        dummy_review = Review(
            hotel_id=hotel.id,
            guest_name="Test Guest (Manual)",
            rating=5.0,
            review_text="This is a test review to verify the dashboard works. The rooms were great!",
            source="System Test",
            status="PENDING",
            review_date=datetime.now().strftime("%Y-%m-%d")
        )
        
        session.add(dummy_review)
        await session.commit()
        print("Dummy Review Added! Refresh your dashboard.")

if __name__ == "__main__":
    import sys
    import os
    # Add backend to path
    sys.path.append(os.path.join(os.getcwd(), 'backend'))
    
    asyncio.run(seed_review())
