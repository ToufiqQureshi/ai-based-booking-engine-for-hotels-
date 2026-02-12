import asyncio
import os
import sys

# Add backend directory to python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)

from app.core.supabase import get_supabase

async def list_files():
    supabase = get_supabase()
    try:
        res = supabase.storage.from_("hotel-photos").list()
        print("Files in hotel-photos bucket:")
        for file in res:
            print(f"- {file['name']}")
    except Exception as e:
        print(f"Error listing bucket: {e}")

if __name__ == "__main__":
    asyncio.run(list_files())
