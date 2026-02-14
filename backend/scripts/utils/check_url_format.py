import asyncio
import os
import sys

# Add backend directory to python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)

from app.core.supabase import get_supabase

async def check_url():
    supabase = get_supabase()
    filename = "e651f975-508f-46e3-b3f8-7b3f6be02933.jpg"
    url = supabase.storage.from_("hotel-photos").get_public_url(filename)
    print(f"Public URL for {filename}:")
    print(url)

if __name__ == "__main__":
    asyncio.run(check_url())
