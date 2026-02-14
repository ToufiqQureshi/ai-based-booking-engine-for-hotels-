import asyncio
import os
import sys

# Add backend directory to python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)

from app.core.supabase import get_supabase

async def init_storage():
    print("🚀 Initializing Supabase Storage Buckets...")
    supabase = get_supabase()
    
    buckets = [
        {"id": "hotel-photos", "public": True},
        {"id": "reports", "public": False}
    ]
    
    for bucket in buckets:
        try:
            print(f"Creating bucket: {bucket['id']}...")
            # create_bucket might fail if it exists, so we handle it
            supabase.storage.create_bucket(bucket["id"], options={"public": bucket["public"]})
            print(f"   ✅ Created.")
        except Exception as e:
            if "already exists" in str(e).lower():
                print(f"   ℹ️ Already exists.")
            else:
                print(f"   ❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(init_storage())
