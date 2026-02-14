import asyncio
import os
import sys
from datetime import datetime
from sqlmodel import select
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import async_session
from app.models.subscription import Subscription
from app.models.hotel import Hotel

load_dotenv()

async def check_subscriptions():
    """
    Check for expired subscriptions and deactivate hotels.
    """
    print(f"[{datetime.utcnow()}] Starting subscription check...")
    
    async with async_session() as session:
        # Find active subscriptions that have passed their end_date
        now = datetime.utcnow()
        result = await session.execute(
            select(Subscription).where(
                Subscription.status == "active",
                Subscription.end_date < now
            )
        )
        expired_subs = result.scalars().all()
        
        if not expired_subs:
            print("No expired subscriptions found.")
            return

        print(f"Found {len(expired_subs)} expired subscriptions.")
        
        for sub in expired_subs:
            print(f"Processing expiration for Hotel ID: {sub.hotel_id}")
            
            # 1. Mark subscription as expired
            sub.status = "expired"
            sub.updated_at = now
            session.add(sub)
            
            # 2. Deactivate the hotel
            hotel = await session.get(Hotel, sub.hotel_id)
            if hotel:
                hotel.is_active = False
                hotel.updated_at = now
                session.add(hotel)
                print(f"✅ Deactivated Hotel: {hotel.name} ({hotel.slug})")
            else:
                print(f"⚠️ Hotel not found for ID: {sub.hotel_id}")
        
        await session.commit()
        print(f"[{datetime.utcnow()}] Subscription check complete.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check_subscriptions())
