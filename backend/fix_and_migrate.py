"""
Fix alembic_version and add rate_plans columns
"""
import asyncio
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine
from sqlalchemy import text

async def migrate():
    async with engine.begin() as conn:
        # Step 1: Update alembic_version to known good state
        await conn.execute(text(
            "UPDATE alembic_version SET version_num = '20023f02b43d' WHERE TRUE"
        ))
        print("✓ Fixed alembic_version table")
        
        # Step 2: Add columns if not exist
        try:
            await conn.execute(text(
                "ALTER TABLE rate_plans ADD COLUMN IF NOT EXISTS min_los INTEGER DEFAULT 1"
            ))
            print("✓ Added min_los column")
        except Exception as e:
            print(f"min_los: {e}")
        
        try:
            await conn.execute(text(
                "ALTER TABLE rate_plans ADD COLUMN IF NOT EXISTS advance_purchase_days INTEGER DEFAULT 0"
            ))
            print("✓ Added advance_purchase_days column")
        except Exception as e:
            print(f"advance_purchase_days: {e}")
        
        try:
            await conn.execute(text(
                "ALTER TABLE rate_plans ADD COLUMN IF NOT EXISTS inclusions JSONB DEFAULT '[]'::jsonb"
            ))
            print("✓ Added inclusions column")
        except Exception as e:
            print(f"inclusions: {e}")
        
        # Step 3: Update alembic to latest
        await conn.execute(text(
            "UPDATE alembic_version SET version_num = '20240209_rate_plan_enhancements' WHERE TRUE"
        ))
        print("✓ Updated alembic_version to latest")
        
    print("\n🎉 Migration complete! Restart server to apply.")

if __name__ == "__main__":
    asyncio.run(migrate())
