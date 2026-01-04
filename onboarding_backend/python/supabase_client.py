import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

if not url or not key:
    print("[Supabase] Warning: SUPABASE_URL or SUPABASE_KEY not found in environment.")
    supabase = None
else:
    supabase: Client = create_client(url, key)
