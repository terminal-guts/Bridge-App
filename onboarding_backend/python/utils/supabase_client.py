import os
from supabase import create_client, Client
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables. Try multiple paths.
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path) # Try backend .env
load_dotenv() # Fallback to root .env

class MockSupabaseTable:
    def insert(self, data): return self
    def update(self, data): return self
    def upsert(self, data): return self
    def execute(self): 
        print("[MOCK DB] Operation executed (no real data saved)")
        return self

class MockSupabaseClient:
    def table(self, name): return MockSupabaseTable()

def get_supabase_client():
    url = os.environ.get("EXPO_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = (os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
           or os.environ.get("SERVICE_ROLE_KEY")
           or os.environ.get("SUPABASE_ANON_KEY"))

    if not url or not key:
        print("\n" + "!"*60)
        print("DATABASE ERROR: No Supabase key found.")
        print("Checked: SUPABASE_SERVICE_ROLE_KEY, SERVICE_ROLE_KEY, SUPABASE_ANON_KEY")
        print("Switching to Mock Database Mode.")
        print("!"*60 + "\n")
        return MockSupabaseClient()
        
    try:
        return create_client(url, key)
    except Exception as e:
        print(f"[Supabase] Connection failed: {e}")
        return MockSupabaseClient()

