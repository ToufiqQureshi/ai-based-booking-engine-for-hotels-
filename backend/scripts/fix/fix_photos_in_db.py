import asyncio
import os
import sys

# Add backend directory to python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)

from sqlmodel import select
from sqlalchemy.orm.attributes import flag_modified
from app.core.database import async_session
from app.models.room import RoomType
from app.models.hotel import Hotel

# Supabase Public URL prefix
SUPABASE_PREFIX = "https://ypwsjwwjhecizvxyyqwk.supabase.co/storage/v1/object/public/hotel-photos/"

async def fix_database():
    async with async_session() as session:
        print("🔍 Scanning for broken URLs...")
        
        # 1. Fix RoomType Photos
        result = await session.execute(select(RoomType))
        rooms = result.scalars().all()
        rooms_fixed = 0
        
        for room in rooms:
            if not room.photos:
                continue
                
            updated = False
            # Deep copy or fresh list construction to be safe
            new_photos = []
            for photo in room.photos:
                url = photo.get('url', '')
                if url.startswith('/static/uploads/'):
                    filename = url.split('/')[-1]
                    # Create a new dict to ensure mutation is detected
                    new_photo = dict(photo)
                    new_photo['url'] = f"{SUPABASE_PREFIX}{filename}"
                    new_photos.append(new_photo)
                    updated = True
                else:
                    new_photos.append(photo)
            
            if updated:
                room.photos = new_photos
                flag_modified(room, "photos")
                session.add(room)
                rooms_fixed += 1
                print(f"   ✅ Fixed photos for Room: {room.name}")

        # 2. Fix Hotel Logos
        result = await session.execute(select(Hotel))
        hotels = result.scalars().all()
        hotels_fixed = 0
        
        for hotel in hotels:
            url = hotel.logo_url
            if url and url.startswith('/static/uploads/'):
                filename = url.split('/')[-1]
                hotel.logo_url = f"{SUPABASE_PREFIX}{filename}"
                session.add(hotel)
                hotels_fixed += 1
                print(f"   ✅ Fixed logo for Hotel: {hotel.name}")

        if rooms_fixed > 0 or hotels_fixed > 0:
            await session.commit()
            print(f"\n🚀 SUCCESS! Fixed {rooms_fixed} rooms and {hotels_fixed} hotels.")
            
            # --- FINAL VERIFICATION ---
            print("\n🧐 Final Verification:")
            result = await session.execute(select(RoomType))
            rooms = result.scalars().all()
            for room in rooms:
               if room.photos:
                   print(f"   Room {room.name}: {room.photos[0]['url'][:60]}...")
        else:
            print("\nℹ️ No broken URLs found.")

if __name__ == "__main__":
    asyncio.run(fix_database())
