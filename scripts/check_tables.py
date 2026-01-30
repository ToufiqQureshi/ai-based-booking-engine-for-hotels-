from sqlalchemy import inspect
from app.core.database import engine
import asyncio

async def check_tables():
    async with engine.begin() as conn:
        def inspect_tables(connection):
            inspector = inspect(connection)
            tables = inspector.get_table_names()
            print("Existing Tables:", tables)
            
            if 'competitor_rates' in tables:
                columns = inspector.get_columns('competitor_rates')
                for c in columns:
                    print(f"Col: {c['name']} - {c['type']}")
            
            if 'competitors' in tables:
                print("Checking competitors table:")
                columns = inspector.get_columns('competitors')
                for c in columns:
                    print(f"Col: {c['name']} - {c['type']}")
            elif 'competitorrate' in tables:
                print("Found competitorrate (singular)")
            else:
                print("Competitor Rates table NOT FOUND")

        await conn.run_sync(inspect_tables)

if __name__ == "__main__":
    import sys
    import os
    sys.path.append(os.path.join(os.getcwd(), 'backend'))
    asyncio.run(check_tables())
