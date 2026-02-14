import sys
import os
import asyncio
import secrets
from sqlmodel import select
import uuid
import traceback

# Add backend package to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from app.core.database import engine
from app.models.user import User, UserRole
from app.models.hotel import Hotel
from app.core.security import get_password_hash
from sqlalchemy.orm import sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession

async def create_superuser():
    print("Starting user creation...")
    
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        print("Checking for existing user...")
        try:
            stmt = select(User).where(User.email == "admin@hotelier.com")
            result = await session.exec(stmt)
            user = result.first()
            
            if user:
                print("User already exists!")
                return
        except Exception:
            with open("error.log", "w") as f:
                traceback.print_exc(file=f)
            print("Error occurred! See error.log")
            return

        print("Creating default hotel...")
        hotel = Hotel(
            id=str(uuid.uuid4()),
            name="Default Hotel",
            slug="default-hotel",  # Added slug
            address="123 Admin St",
            city="Admin City",
            country="Admin Country",
            phone="+1234567890",
            email="admin@hotelier.com"
        )
        session.add(hotel)
        
        print("Creating superuser...")
        # Get password from environment or generate a random one
        admin_password = os.getenv("DEFAULT_ADMIN_PASSWORD")
        is_random = False
        if not admin_password:
            print("   ⚠️  DEFAULT_ADMIN_PASSWORD not set. Generating a random password.")
            admin_password = secrets.token_urlsafe(12)
            is_random = True

        user = User(
            email="admin@hotelier.com",
            name="Admin User",
            hashed_password=get_password_hash(admin_password),
            role=UserRole.OWNER,
            hotel_id=hotel.id,
            is_active=True
        )
        session.add(user)
        
        try:
            await session.commit()
            print("\n--- User Created Successfully ---")
            print(f"Email: {user.email}")
            if is_random:
                print(f"Temporary Password: {admin_password}")
                print("⚠️  Please change this password immediately after login.")
            else:
                print(f"Password: (as provided in DEFAULT_ADMIN_PASSWORD)")
        except Exception:
             with open("error.log", "w") as f:
                traceback.print_exc(file=f)
             print("Error during commit! See error.log")

if __name__ == "__main__":
    if sys.platform == 'win32':
         asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(create_superuser())
