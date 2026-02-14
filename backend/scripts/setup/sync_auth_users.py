import asyncio
import os
import sys
import secrets
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, text

# Add backend directory to python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)

from app.core.database import engine
from app.core.supabase import get_supabase
from app.models.user import User

async def sync_users():
    print("🚀 Ensuring Schema & Syncing users to Supabase Auth...")
    supabase = get_supabase()
    
    # 1. Ensure Column exists (Direct SQL to avoid model mismatch errors)
    async with engine.begin() as conn:
        await conn.execute(text('ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_id VARCHAR UNIQUE'))
    print("   ✅ Schema verified.")

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Refetch models to pick up the new column if possible, but select() knows the model
        result = await session.execute(select(User))
        users = result.scalars().all()
        
        # Get migration password from environment or use a random one
        env_password = os.getenv("SUPABASE_MIGRATION_PASSWORD")
        if not env_password:
            print("   ⚠️  SUPABASE_MIGRATION_PASSWORD not set. Using random passwords for each user.")
            print("      Users will need to use 'Forgot Password' to set their own password.")

        for user in users:
            if user.supabase_id:
                print(f"Skipping {user.email} (Already Linked: {user.supabase_id})")
                continue

            print(f"Syncing {user.email}...")
            
            # Use environment password or generate a secure random one
            password = env_password or secrets.token_urlsafe(16)

            try:
                # Create user in Supabase Auth
                auth_user = supabase.auth.admin.create_user({
                    "email": user.email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {"name": user.name, "role": user.role}
                })
                
                if auth_user and auth_user.user:
                    user.supabase_id = auth_user.user.id
                    session.add(user)
                    print(f"   ✅ Created: {auth_user.user.id}")
                else:
                    print(f"   ⚠️ Warning: User not returned for {user.email}")
            except Exception as e:
                # Handle 'user already exists' by trying to fetch them
                if "already registered" in str(e).lower() or "unique" in str(e).lower():
                    print(f"   ℹ️ User already exists in Auth. Looking up...")
                    # Note: Fetching user by email via admin API
                    users_list = supabase.auth.admin.list_users()
                    for au in users_list:
                        if au.email == user.email:
                            user.supabase_id = au.id
                            session.add(user)
                            print(f"   ✅ Linked existing: {au.id}")
                            break
                else:
                    print(f"   ❌ Error for {user.email}: {e}")
        
        await session.commit()
    print("\n🎉 Auth Migration Complete!")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(sync_users())
