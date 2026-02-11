from supabase import create_client, Client
from app.core.config import get_settings

settings = get_settings()

def get_supabase() -> Client:
    """Provides a Supabase client using Service Role key for admin actions."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

def verify_supabase_token(token: str) -> str | None:
    """
    Verifies a Supabase JWT and returns the user's Supabase ID (sub).
    """
    try:
        supabase = get_supabase()
        user_response = supabase.auth.get_user(token)
        if user_response and user_response.user:
            return user_response.user.id
        return None
    except Exception as e:
        print(f"Supabase Auth Error: {e}")
        return None
