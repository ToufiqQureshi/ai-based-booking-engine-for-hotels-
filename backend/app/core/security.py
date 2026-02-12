"""
Security Utilities
JWT Token generation aur verification yahan hoti hai.
Password hashing bhi yahan handle hota hai.
"""
from passlib.context import CryptContext

# Password hashing context - bcrypt use kar rahe hain (industry standard)
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# NOTE: JWT functions removed as we migrated to Supabase Auth completely.
# Only password hashing utilities remain for legacy data consistency.

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    User ka password verify karta hai.
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Password ko hash karta hai storage ke liye.
    """
    return pwd_context.hash(password)
