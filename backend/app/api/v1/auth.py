"""
Authentication Router
Login, Signup, Refresh token endpoints.
Frontend ke auth.ts aur client.ts se match karta hai.
"""
from datetime import timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
import re
import uuid
import logging

from app.core.database import get_session
from app.core.limiter import limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_reset_token,
    verify_password,
    get_password_hash,
    verify_token
)
from app.core.config import get_settings
from app.models.user import User, UserCreate, UserRead, UserRole
from app.models.hotel import Hotel
from pydantic import BaseModel, EmailStr

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()


def generate_slug(name: str) -> str:
    """Hotel name se URL-friendly slug banata hai"""
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_-]+', '-', slug)
    return slug


class RegisterRequest(BaseModel):
    """Naya hotel aur profile setup karne ke liye schema"""
    name: str # User ka naam
    hotel_name: str # Hotel ka naam


from app.api.deps import get_current_user
from app.core.supabase import get_supabase

@router.post("/register")
@limiter.limit("3/minute")
async def register_hotel_and_profile(
    request: Request,
    register_data: RegisterRequest,
    session: Annotated[AsyncSession, Depends(get_session)]
):
    """
    Supabase me signup ke baad, ye endpoint hotel aur Postgres profile banata hai.
    Dependency 'verify_supabase_token' (via some path) header se token check karti hai.
    Lekin yahan hum chahte hain ki authenticated user hi register kare.
    """
    # 1. Frontend ne token bheja hoga, dependency se hume authenticated supabase user mil jayega
    # Lekin yahan hume naya user banana hai jo database me nahi hai.
    # Isliye hum token directly verify karenge instead of using 'get_current_user' 
    # kyuki current_user database me query karta hai.
    
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    
    token = auth_header.split(" ")[1]
    
    from app.core.supabase import verify_supabase_token
    supabase_id = verify_supabase_token(token)
    
    if not supabase_id:
        raise HTTPException(status_code=401, detail="Invalid Supabase token")

    # 2. Check karo: Kya ye user pehle se registered hai?
    result = await session.execute(select(User).where(User.supabase_id == supabase_id))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="User already registered in database")

    # 3. Email fetch karo Supabase se (optional, frontend se bhi le sakte hain par security ke liye)
    supabase_client = get_supabase()
    auth_user = supabase_client.auth.admin.get_user_by_id(supabase_id)
    if not auth_user or not auth_user.user:
        raise HTTPException(status_code=404, detail="User not found in Supabase Auth")
    
    email = auth_user.user.email

    # 4. Create Hotel + User Profile
    hotel_slug = generate_slug(register_data.hotel_name)
    hotel = Hotel(name=register_data.hotel_name, slug=hotel_slug)
    session.add(hotel)
    await session.flush()
    
    user = User(
        id=str(uuid.uuid4()),
        email=email,
        name=register_data.name,
        hashed_password="SUPABASE_AUTH", # No local password needed
        role=UserRole.OWNER,
        hotel_id=hotel.id,
        supabase_id=supabase_id,
        is_active=True
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    
    return {
        "message": "Hotel and profile initialized successfully",
        "user": UserRead.model_validate(user).model_dump()
    }
