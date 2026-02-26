import os
from supabase import create_client, Client
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables. Try multiple paths.
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path) # Try backend .env
load_dotenv() # Fallback to root .env

def get_supabase_client():
    url = os.environ.get("EXPO_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = (os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
           or os.environ.get("SERVICE_ROLE_KEY")
           or os.environ.get("SUPABASE_ANON_KEY"))

    if not url or not key:
        raise RuntimeError("Cannot start without Supabase credentials")

    # Strip whitespace and trailing slashes
    url = url.strip().rstrip("/")
    key = key.strip()

    return create_client(url, key)
