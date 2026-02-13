import jwt
from supabase import create_client, Client
from app.core.config import get_settings

settings = get_settings()

def get_supabase() -> Client:
    """Provides a Supabase client using Service Role key for admin actions."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

def verify_supabase_token(token: str) -> str | None:
    """
    Verifies a Supabase JWT locally (FAST) instead of calling Supabase API (SLOW).
    Falls back to API call only if JWT Secret is missing.
    """
    if settings.SUPABASE_JWT_SECRET:
        try:
            # Local Verification (No Network Call) - < 1ms
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_aud": False} # Audience check skip kar rahe hain flexible hone ke liye
            )
            return payload.get("sub")
        except jwt.ExpiredSignatureError:
            print("Token Expired")
            return None
        except jwt.InvalidTokenError as e:
            print(f"Invalid Token: {e}")
            return None
    else:
        # Fallback to slower API call if secret not configured
        try:
            supabase = get_supabase()
            user_response = supabase.auth.get_user(token)
            if user_response and user_response.user:
                return user_response.user.id
            return None
        except Exception as e:
            print(f"Supabase Auth Error: {e}")
            return None
