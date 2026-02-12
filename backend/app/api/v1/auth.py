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
    verify_password,
    get_password_hash,
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


class LoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ChangePasswordRequest(BaseModel):
    new_password: str


from app.core.supabase import get_supabase
from pydantic import BaseModel, EmailStr

@router.post("/signup")
@limiter.limit("3/minute")
async def signup(
    request: Request,
    user_data: UserCreate,
    session: Annotated[AsyncSession, Depends(get_session)]
):
    """
    New user + hotel registration with Supabase Auth integration.
    """
    # 1. Supabase Auth se user create karo
    supabase = get_supabase()
    try:
        # Create user in Supabase Auth
        auth_response = supabase.auth.admin.create_user({
            "email": user_data.email,
            "password": user_data.password,
            "email_confirm": True,
            "user_metadata": {"name": user_data.name}
        })
        
        if not auth_response or not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not create identity in Supabase"
            )
        
        supabase_id = auth_response.user.id
        
    except Exception as e:
        logger.error(f"Supabase Auth error during signup: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # 2. Database logic (Hotel + User)
    hotel_slug = generate_slug(user_data.hotel_name)
    hotel = Hotel(name=user_data.hotel_name, slug=hotel_slug)
    session.add(hotel)
    await session.flush()
    
    user = User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=get_password_hash(user_data.password), # Fallback/Legacy
        role=UserRole.OWNER,
        hotel_id=hotel.id,
        supabase_id=supabase_id
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    
    # 3. Create session tokens (Supabase handles this on frontend, but we return for legacy compat)
    # Frontend handles AuthContext update automatically now
    return {
        "user": UserRead.model_validate(user).model_dump(),
        "supabase_id": supabase_id
    }


@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    session: Annotated[AsyncSession, Depends(get_session)]
):
    """
    Password reset request.
    Delegates to Supabase Auth which handles emails securely.
    """
    supabase = get_supabase()
    try:
        supabase.auth.reset_password_email(data.email)
    except Exception as e:
        # Log error but don't expose it to user to prevent enumeration
        logger.error(f"Supabase password reset error: {e}")

    return {"message": "If this email is registered, you will receive password reset instructions."}


# Reset Password is now handled by Supabase (User clicks email link -> Redirects to Frontend -> Frontend calls Supabase update)
# So we remove the backend reset-password endpoint.


from app.api.deps import get_current_user

@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)]
):
    """
    Change password for logged in user.
    Uses Supabase Admin API to update password securely.
    """
    supabase = get_supabase()
    try:
        # Admin update user password
        supabase.auth.admin.update_user_by_id(
            current_user.supabase_id,
            {"password": request.new_password}
        )

        # Also update local hash for consistency (though auth is now handled by Supabase)
        current_user.hashed_password = get_password_hash(request.new_password)
        session.add(current_user)
        await session.commit()

    except Exception as e:
        logger.error(f"Password update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not update password"
        )

    return {"message": "Password updated successfully"}
