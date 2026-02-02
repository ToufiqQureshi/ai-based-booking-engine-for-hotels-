import asyncio
import sys
import os

# 1. Setup Path to find 'app'
backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.append(backend_path)

# 2. Mock Environment Variables to satisfy Config Validation
# Config requires SECRET_KEY, so we provide a dummy one if missing.
os.environ["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dummy_secret_key_for_db_check")
os.environ["DATABASE_URL"] = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@127.0.0.1:5433/hotelier_hub")

# 3. Import after Path setup
try:
    from sqlalchemy import text
    from app.core.database import engine
except ImportError as e:
    print(f"❌ Import Error: {e}")
    print(f"Current Path: {sys.path}")
    sys.exit(1)

async def check_connection():
    print(f"Checking database connection at: {os.environ['DATABASE_URL']}...")
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            value = result.scalar()
            if value == 1:
                print("✅ Database connection successful! (SELECT 1 returned 1)")
            else:
                print(f"⚠️  Database connection successful but returned unexpected value: {value}")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        # Print helpful hint if it's connection refused
        if "Connection refused" in str(e):
            print("👉 Check if Docker Desktop is running and Postgres container is up.")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_connection())
