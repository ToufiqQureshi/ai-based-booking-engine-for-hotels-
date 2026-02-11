"""
Authentication Dependencies
Protected routes ke liye current user retrieve karta hai.
"""
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_session
from app.core.supabase import verify_supabase_token
from app.models.user import User
from sqlalchemy.orm import selectinload

# OAuth2 scheme - Frontend Authorization header se token extract karega
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    session: Annotated[AsyncSession, Depends(get_session)]
) -> User:
    """
    Token verify karke current user return karta hai.
    Supabase Native Auth support ke saath.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Supabase Token verify karo
    supabase_id = verify_supabase_token(token)
    if supabase_id is None:
        raise credentials_exception
    
    # User database se fetch karo using supabase_id
    query = select(User).where(User.supabase_id == supabase_id).options(selectinload(User.hotel))
    result = await session.execute(query)
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is deactivated"
        )
    
    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """Shortcut dependency for active user"""
    return current_user


# Type alias for cleaner route signatures
CurrentUser = Annotated[User, Depends(get_current_active_user)]
DbSession = Annotated[AsyncSession, Depends(get_session)]
