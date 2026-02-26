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
        print("\n" + "!"*60)
        print("DATABASE ERROR: No Supabase URL or key found.")
        print(f"  URL found: {bool(url)}")
        print(f"  Key found: {bool(key)}")
        print("!"*60 + "\n")
        raise RuntimeError("Cannot start without Supabase credentials")

    # Strip whitespace and trailing slashes
    url = url.strip().rstrip("/")
    key = key.strip()

    print(f"[Supabase] Connecting to: {url}")
    print(f"[Supabase] Using key type: {'service_role' if os.environ.get('SUPABASE_SERVICE_ROLE_KEY') else 'anon'}")

    try:
        client = create_client(url, key)
        # Verify connection with a simple query
        client.table("profiles").select("id").limit(1).execute()
        print("[Supabase] Connection verified successfully")
        return client
    except Exception as e:
        print(f"[Supabase] Connection failed: {e}")
        print(f"[Supabase] URL: {url}")
        print(f"[Supabase] Key prefix: {key[:20]}...")
        raise RuntimeError(f"Supabase connection failed: {e}")
