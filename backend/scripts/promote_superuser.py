import sys
import os
import asyncio
from sqlmodel import select

# Add backend directory to python path
backend_dir = os.path.join(os.path.dirname(__file__), '..')
sys.path.append(backend_dir)

# Load .env file explicitly
from dotenv import load_dotenv
load_dotenv(os.path.join(backend_dir, '.env'))

from app.core.database import async_session_factory
from app.models.user import User, UserRole

import argparse

async def promote_user():
    parser = argparse.ArgumentParser(description='Promote a user to SUPER_ADMIN')
    parser.add_argument('--email', help='Email of the user to promote')
    args = parser.parse_args()

    async with async_session_factory() as session:
        # If email provided, promote directly
        if args.email:
            result = await session.execute(select(User).where(User.email == args.email))
            user = result.scalar_one_or_none()
            if user:
                user.role = UserRole.SUPER_ADMIN
                session.add(user)
                await session.commit()
                print(f"\n✅ Successfully promoted {user.name} ({user.email}) to SUPER_ADMIN!")
                return
            else:
                print(f"\n❌ User with email {args.email} not found.")
                return

        # List all users (Interactive mode)
        result = await session.execute(select(User))
        users = result.scalars().all()
        
        print("\nExisting Users:")
        print("-" * 50)
        for i, user in enumerate(users):
            print(f"{i+1}. {user.name} ({user.email}) - {user.role}")
            
        if not users:
            print("No users found!")
            return

        # Simple input to choose
        try:
            choice = int(input("\nEnter number of user to promote to SUPER_ADMIN: "))
            if 1 <= choice <= len(users):
                target_user = users[choice-1]
                target_user.role = UserRole.SUPER_ADMIN
                session.add(target_user)
                await session.commit()
                print(f"\n✅ Successfully promoted {target_user.name} to SUPER_ADMIN!")
            else:
                print("Invalid selection.")
        except ValueError:
            print("Invalid input.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(promote_user())
