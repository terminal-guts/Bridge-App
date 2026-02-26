from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sys
from pathlib import Path

current_dir = Path(__file__).parent
sys.path.append(str(current_dir))

from utils.supabase_client import get_supabase_client
from sms_service import SMSService, generate_otp
from services.email_service import EmailService
from services.photo_analysis_service import PhotoAnalysisService
from services.aws_service import AwsService
from services.comprehend_service import ComprehendService
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
try:
    import deep
    import AIFace
except ImportError as e:
    print(f"[WARN] AI modules could not be imported: {e}")
    deep = None
    AIFace = None
except Exception as e:
    print(f"[WARN] Unexpected error importing AI modules: {e}")
    deep = None
    AIFace = None

app = FastAPI(title="Bridge Onboarding API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for development
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# --- DDoS Protection: Rate Limiting & Payload Limits ---
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

class LimitUploadSize(BaseHTTPMiddleware):
    def __init__(self, app, max_upload_size: int):
        super().__init__(app)
        self.max_upload_size = max_upload_size

    async def dispatch(self, request: Request, call_next):
        if request.method in ["POST", "PUT", "PATCH"]:
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > self.max_upload_size:
                return JSONResponse(status_code=413, content={"detail": "Payload Too Large. Max size exceeded."})
        return await call_next(request)

# Limit to 10MB payload to prevent memory exhaustion attacks
app.add_middleware(LimitUploadSize, max_upload_size=10_000_000)
# --------------------------------------------------------

sms_service = SMSService()
email_service = EmailService()
photo_analysis_service = PhotoAnalysisService()
aws_service = AwsService()
comprehend_service = ComprehendService()
supabase = get_supabase_client()

from routers import voting
from routers import proposals
app.include_router(voting.router)
app.include_router(proposals.router)

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from services.daily_pairing_engine import run_daily_pairing
from services.match_nudge_engine import run_match_nudge_job

scheduler = AsyncIOScheduler()

def daily_pairing_job():
    try:
        print("[SCHEDULER] Running daily pairing generation...")
        result = run_daily_pairing(supabase)
        print(f"[SCHEDULER] Daily pairing complete: {result}")
    except Exception as e:
        print(f"[SCHEDULER] Error in daily pairing: {e}")

def nudge_job():
    try:
        print("[SCHEDULER] Checking for inactive matches to nudge...")
        run_match_nudge_job(supabase)
    except Exception as e:
        print(f"[SCHEDULER] Error in nudge job: {e}")

scheduler.add_job(daily_pairing_job, 'cron', hour=0, minute=0, timezone='UTC')
scheduler.add_job(nudge_job, 'cron', hour=12, minute=0, timezone='UTC')

@app.on_event("startup")
async def start_scheduler():
    scheduler.start()
    print("[SCHEDULER] APScheduler started - daily pairings at 00:00 UTC")

@app.on_event("shutdown")
async def shutdown_scheduler():
    scheduler.shutdown()

@app.get("/")
async def root():
    return {"status": "online", "message": "Bridge Backend is running", "environment": "production"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/debug/twilio")
async def debug_twilio():
    return {
        "client_initialized": sms_service.client is not None,
        "from_number": sms_service.from_number is not None,
        "sid_prefix": sms_service.account_sid[:4] if sms_service.account_sid else None,
    }

verification_codes: Dict[str, str] = {}


#change generations later on perhaps but this is what we have as a baseline for now.
class Photo_Gen():
    def __init__(self, source):
        self.age = None
        self.gen = None
        self.source = source 
        self.ai = None
    def set_gen(self, age):
        if age < 12:
            self.gen = 0
        elif age < 28:
            self.gen = 1
        elif age < 44:
            self.gen = 2
        elif age < 60:
            self.gen = 3
        elif age < 70:
            self.gen = 4
        elif age < 79:
            self.gen = 5
        else:
            self.gen = 6
    def get_gen(self):
        return self.gen
    def det_age(self):
        # DeepFace supports numpy arrays
        return (deep.deep_age(self.source))[0]
    def get_age(self):
        return self.age
    def set_age(self, age):
        self.age = age
    def get_path(self):
        return self.source
    def set_path(self, path):
        self.source = path
    def det_ai(self):
        return (AIFace.get_ai_probability(self.source))
    def set_ai(self, conf):
        self.ai = conf
    def get_ai(self):
        return self.ai

class User_Profile(Photo_Gen):
    def __init__(self, phone):
        self.name = None
        self.phone = phone
        self.age = None
        self.gen = None
        #image should probably be stored on local machine
        self.path = None
        self.location = None
        self.interests = None
        self.gender = None
        self.pronouns = None
        self.lifestyle = None
        self.friends = set()

class PhoneRequest(BaseModel):
    phone_number: str

class VerifyRequest(BaseModel):
    phone_number: str
    code: str

class EmailRequest(BaseModel):
    email: str

class VerifyEmailRequest(BaseModel):
    email: str
    code: str

class DeepQuestion(BaseModel):
    question_id: int
    question_text: str
    answer_text: str
    tier: int = 1

class OnboardingCompletion(BaseModel):
    user_id: str
    first_name: str
    last_name: str
    age: int
    gender: List[str]
    location: str
    photos: List[str]
    
    # Extended Profile Fields
    pronouns: Optional[str] = None
    pronouns_list: List[str] = []
    custom_gender: Optional[str] = None
    hometown: Optional[str] = None
    current_job: Optional[str] = None
    company_position: Optional[str] = None
    education_level: Optional[str] = None
    school: Optional[str] = None
    height_inches: Optional[int] = None
    ethnicity: Optional[str] = None
    religion: Optional[str] = None
    political_leaning: Optional[str] = None
    has_children: Optional[str] = None
    family_plans: Optional[str] = None
    drinking_frequency: Optional[str] = None
    cannabis_frequency: Optional[str] = None
    tobacco_frequency: Optional[str] = None
    other_drugs_frequency: Optional[str] = None
    interests: List[str] = []
    values: List[str] = []
    bio: Optional[str] = None
    
    # Preferences (to be saved to user_preferences)
    looking_for: Optional[str] = None
    interested_in_genders: List[str] = []
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    height_min: Optional[int] = None
    height_max: Optional[int] = None
    max_distance: Optional[int] = None
    preferred_ethnicities: List[str] = []
    partner_lifestyle_preferences: Dict[str, str] = {}
    
    # Deep Questions
    deep_questions: List[DeepQuestion] = []

class SaveStepRequest(BaseModel):
    user_id: str
    step_key: str
    data: Dict

# --- Endpoints ---

@app.post("/onboarding/save-step")
async def save_onboarding_step(request: SaveStepRequest):
    """
    Saves partial onboarding state to the database.
    """
    try:
        # Ignore Supabase for phone-related steps as requested
        is_phone_step = request.step_key in ["phone_number", "phone_verification"]
        if is_phone_step:
            print(f"[ONBOARDING] Skipping Supabase save for phone step: {request.step_key}")
            return {"status": "success", "message": f"Step {request.step_key} ignored (Supabase bypassed)"}

        # 0. Ensure Profile Exists (to satisfy Foreign Key constraints)
        # We try to create a minimal profile if one doesn't exist
        try:
            # Check if profile exists first to avoid overwriting invalid data if unwanted? 
            # Actually upsert with just ID is safe if we don't overwrite other fields, 
            # BUT we need required fields like first_name/last_name/age/location.
            # We can put placeholders.
            
            # Note: real auth usually creates this trigger, but for manual saving from frontend mock:
            user_exists = supabase.table("user_profiles").select("id").eq("id", request.user_id).execute()
            if not user_exists.data:
                print(f"[ONBOARDING] Auto-creating missing profile for {request.user_id}")
                supabase.table("user_profiles").insert({
                    "id": request.user_id,
                    "first_name": "", # Placeholder
                    "last_name": "", # Placeholder
                    "age": 18, # Placeholder
                    "location": "Unknown" # Placeholder
                }).execute()
                
                # Also initialize preferences
                supabase.table("user_preferences").insert({"user_id": request.user_id}).execute()
        except Exception as e:
            print(f"[ONBOARDING] Warning checking/creating profile: {e}")

        # 1. Save to onboarding_progress
        response = supabase.table("onboarding_progress").upsert({
            "user_id": request.user_id,
            "current_step": request.step_key,
            "data": request.data
        }).execute()

        # 2. If preferences are present, sync them to user_preferences table
        if "preferences" in request.data:
            prefs = request.data["preferences"]
            
            # Map camelCase from frontend/test to snake_case for DB
            pref_data = {
                "user_id": request.user_id,
                "age_min": prefs.get("ageMin"),
                "age_max": prefs.get("ageMax"),
                "height_min": prefs.get("heightMin"),
                "height_max": prefs.get("heightMax"),
                "preferred_gender": prefs.get("preferredGender"),
                "looking_for": prefs.get("lookingFor"),
                "distance_miles": prefs.get("distanceMiles")
            }
            
            # Filter out None values to avoid overwriting existing data with nulls
            pref_data = {k: v for k, v in pref_data.items() if v is not None}
            
            if len(pref_data) > 1: # More than just user_id
                supabase.table("user_preferences").upsert(pref_data).execute()
                print(f"Synced preferences for user {request.user_id}")
                
        # 3. Handle Photos if present
        if "photos" in request.data and isinstance(request.data["photos"], list):
            # This is partial save during onboarding (e.g. photo step)
            photos = request.data["photos"]
            
            try:
           
                
                supabase.table("user_photos").delete().eq("user_id", request.user_id).execute()
                for i, p in enumerate(photos):
                   
                     if isinstance(p, dict):
                         url = p.get("url", "")
                         is_main = p.get("isMain", False) or (i==0)
                     else:
                         url = str(p)
                         is_main = (i==0)
                         
                     if url:
                        supabase.table("user_photos").insert({
                            "user_id": request.user_id,
                            "storage_path": url,
                            "url": url,
                            "is_main": is_main,
                            "display_order": i
                        }).execute()
            except Exception as e:
                print(f"[ONBOARDING] Error syncing photos: {e}")


        return {"status": "success", "message": f"Step {request.step_key} saved and synced"}
    except Exception as e:
        print(f"Error saving onboarding step: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/onboarding/send-otp")
@limiter.limit("5/minute")
async def send_otp(request: Request, payload: PhoneRequest):
    code = generate_otp()
    verification_codes[payload.phone_number] = code
    
    success = sms_service.send_verification_code(payload.phone_number, code)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send OTP")
    return {"message": "OTP sent successfully"}

@app.post("/onboarding/verify-otp")
@limiter.limit("10/minute")
async def verify_otp(request: Request, payload: VerifyRequest):
    stored_code = verification_codes.get(payload.phone_number)
    
    # Allow static code for App Store Review test number
    is_test_number = payload.phone_number in ["+15555555555", "5555555555"]
    is_static_code = payload.code == "123456"

    if (stored_code and stored_code == payload.code) or (is_test_number and is_static_code):
        # Code matches
        if payload.phone_number in verification_codes:
            del verification_codes[payload.phone_number]
            
        # Task 1: Check for existing user in Supabase
        user_id = None
        user_exists = False
        
        try:
            # We derive a consistent UUID from the phone number for this mock version.
            # REAL WORLD: You'd query auth.users via Supabase Auth Admin API.
            import hashlib
            derived_user_id = str(hashlib.md5(payload.phone_number.encode()).hexdigest())
            # Convert to UUID format
            user_id = f"00000000-0000-0000-0000-{derived_user_id[:12]}"
            
            # Check if profile exists
            response = supabase.table("user_profiles").select("id").eq("id", user_id).execute()
            user_exists = bool(response.data)
            
            if user_exists:
                print(f"[AUTH] Found existing user profile for phone: {user_id}")
            else:
                print(f"[AUTH] No profile found, treating as NEW user for phone: {user_id}")
                
        except Exception as e:
            print(f"[AUTH] Error checking user records: {e}")
            user_id = "00000000-0000-0000-0000-000000000001"
            
        return {
            "message": "Phone verified successfully",
            "user_id": user_id,
            "is_new_user": not user_exists
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid verification code")

@app.post("/onboarding/send-email-otp")
@limiter.limit("5/minute")
async def send_email_otp(request: Request, payload: EmailRequest):
    """
    Sends an OTP to the user's email.
    """
    code = generate_otp()
    verification_codes[payload.email] = code
    
    success = email_service.send_verification_code(payload.email, code)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email OTP")
    
    return {"message": "Email OTP sent successfully"}

class ModerationRequest(BaseModel):
    text: str

@app.post("/moderate-text")
@limiter.limit("30/minute")
async def moderate_text(request: Request, payload: ModerationRequest):
    """
    Analyzes text for sentiment, PII, banned phrases, and asking-out intent.
    """
    try:
        results = comprehend_service.moderate_content(payload.text)
        return results
    except Exception as e:
        print(f"Error in text moderation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/onboarding/verify-email-otp")
@limiter.limit("10/minute")
async def verify_email_otp(request: Request, payload: VerifyEmailRequest):
    stored_code = verification_codes.get(payload.email)

    # Allow static code for App Store Review test email
    is_test_email = payload.email == "test@bridgedate.app"
    is_static_code = payload.code == "123456"

    if (stored_code and stored_code == payload.code) or (is_test_email and is_static_code):
        if payload.email in verification_codes:
            del verification_codes[payload.email]
            
        # Derive consistent UUID from email
        import hashlib
        derived_user_id = str(hashlib.md5(payload.email.encode()).hexdigest())
        user_id = f"00000000-0000-0000-0000-{derived_user_id[:12]}"
        
        user_exists = False
        try:
            response = supabase.table("user_profiles").select("id").eq("id", user_id).execute()
            user_exists = bool(response.data)
            if user_exists:
                print(f"[AUTH] Found existing user profile for email: {user_id}")
            else:
                print(f"[AUTH] No profile found, treating as NEW user for email: {user_id}")
        except Exception as e:
            print(f"[AUTH] Error checking user records: {e}")
            
        return {
            "message": "Email verified successfully",
            "user_id": user_id,
            "is_new_user": not user_exists
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid verification code")

@app.post("/onboarding/complete")
async def complete_onboarding(data: OnboardingCompletion, background_tasks: BackgroundTasks):
    """
    Finalizes onboarding by saving data to Supabase and triggering photo analysis.
    """
    try:
        print(f"[ONBOARDING] Complete called for user: {data.user_id}")
        # Moderation Check (Restricted Words)
        # Check bio
        if data.bio:
            mod_res = aws_service.check_restricted_words(data.bio)
            if not mod_res["allowed"]:
                raise HTTPException(status_code=400, detail=mod_res["message"])
                
        # Check deep questions
        for dq in data.deep_questions:
            mod_res = aws_service.check_restricted_words(dq.answer_text)
            if not mod_res["allowed"]:
                raise HTTPException(status_code=400, detail=f"In answer to '{dq.question_text}': {mod_res['message']}")

        # 1. Update Profile in Supabase
        profile_data = {
            "first_name": data.first_name,
            "last_name": data.last_name,
            "age": data.age,
            "gender": data.gender,
            "location": data.location,
            "profile_completed": True,
            # Extended Fields
            "pronouns": data.pronouns,
            "pronouns_list": data.pronouns_list,
            "custom_gender": data.custom_gender,
            "hometown": data.hometown,
            "current_job": data.current_job,
            "company_position": data.company_position,
            "education_level": data.education_level,
            "school": data.school,
            "height_inches": data.height_inches,
            "ethnicity": data.ethnicity,
            "religion": data.religion,
            "political_leaning": data.political_leaning,
            "has_children": data.has_children,
            "family_plans": data.family_plans,
            "drinking_frequency": data.drinking_frequency,
            "cannabis_frequency": data.cannabis_frequency,
            "tobacco_frequency": data.tobacco_frequency,
            "other_drugs_frequency": data.other_drugs_frequency,
            "interests": data.interests,
            "values": data.values,
            "bio": data.bio
        }
        
        # Remove None values
        profile_data = {k: v for k, v in profile_data.items() if v is not None}
        
        response = supabase.table("user_profiles").upsert({
            "id": data.user_id,
            **profile_data
        }).execute()
        
        # some shit to do with preferences
        pref_data = {
            "user_id": data.user_id,
            "looking_for": data.looking_for,
            "interested_in_genders": data.interested_in_genders,
            "age_min": data.age_min,
            "age_max": data.age_max,
            "height_min": data.height_min,
            "height_max": data.height_max,
            "max_distance": data.max_distance,
            "preferred_ethnicities": data.preferred_ethnicities,
            "partner_lifestyle_preferences": data.partner_lifestyle_preferences
        }
        # k, v cache
        pref_data = {k: v for k, v in pref_data.items() if v is not None}
        supabase.table("user_preferences").upsert(pref_data).execute()
        
        # 2. Save Photo metadata
        for i, url in enumerate(data.photos):
            supabase.table("user_photos").insert({
                "user_id": data.user_id,
                "url": url,
                "storage_path": url.split("/")[-1], # Simplified
                "display_order": i,
                "is_main": i == 0
            }).execute()

        # 3. Save Deep Questions
        for dq in data.deep_questions:
            supabase.table("deep_question_answers").upsert({
                "user_id": data.user_id,
                "question_id": dq.question_id,
                "question_text": dq.question_text,
                "answer_text": dq.answer_text,
                "tier": dq.tier
            }, on_conflict="user_id, question_id").execute()

        # 4. Trigger Photo Analysis in background
        if data.photos:
            background_tasks.add_task(photo_service.verify_batch, data.photos, data.user_id)
        
        return {"status": "success", "message": "Onboarding completed"}
        
    except Exception as e:
        print(f"Error completing onboarding: {e}")
        # Dont crash if DB partial fail
        return {"status": "success", "message": "Onboarding completed locally (with partial DB success)"}

@app.post("/moderate/text")
async def moderate_text(request: Dict[str, Any]):
    text = request.get("text", "")
    has_voice_memo = request.get("has_voice_memo", False)
    
    result = aws_service.check_restricted_words(text, has_voice_memo)
    return result

@app.post("/moderate/image")
async def moderate_image(request: Dict[str, Any]):
    # In a real scenario, this would take image bytes or a URL
    # For now, we'll provide a placeholder that users can call
    return {"status": "Endpoint ready. Integration with upload flow recommended."}

@app.get("/profile/{user_id}")
async def get_profile(user_id: str):
    """
    Fetches the full user profile from Supabase.
    """
    try:
        print(f"[PROFILE] Fetching profile for user: {user_id}")
        
        # 1. Get Profile
        profile_res = supabase.table("user_profiles").select("*").eq("id", user_id).maybe_single().execute()
        if not profile_res.data:
            raise HTTPException(status_code=404, detail="Profile not found")
            
        profile = profile_res.data
        
        # 2. Get Preferences
        prefs_res = supabase.table("user_preferences").select("*").eq("user_id", user_id).maybe_single().execute()
        profile["preferences"] = prefs_res.data if prefs_res.data else {}
        
        # 3. Get Photos
        photos_res = supabase.table("user_photos").select("*").eq("user_id", user_id).order("display_order").execute()
        profile["photos"] = photos_res.data if photos_res.data else []
        
        # 4. Get Deep Questions
        dq_res = supabase.table("deep_question_answers").select("*").eq("user_id", user_id).execute()
        profile["deep_questions"] = dq_res.data if dq_res.data else []
        
        return {"status": "success", "data": profile}
        
    except Exception as e:
        print(f"Error fetching profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[List[str]] = None
    location: Optional[str] = None
    pronouns: Optional[str] = None
    pronouns_list: Optional[List[str]] = None
    custom_gender: Optional[str] = None
    hometown: Optional[str] = None
    current_job: Optional[str] = None
    occupation: Optional[str] = None 
    company_position: Optional[str] = None
    education_level: Optional[str] = None
    school: Optional[str] = None
    height_inches: Optional[int] = None
    ethnicity: Optional[str] = None
    religion: Optional[str] = None
    political_leaning: Optional[str] = None
    has_children: Optional[str] = None
    family_plans: Optional[str] = None
    drinking_frequency: Optional[str] = None
    cannabis_frequency: Optional[str] = None
    tobacco_frequency: Optional[str] = None
    other_drugs_frequency: Optional[str] = None
    interests: Optional[List[str]] = None
    values: Optional[List[str]] = None
    bio: Optional[str] = None
    is_paused: Optional[bool] = None
    photos: Optional[List[Dict[str, Any]]] = None
    preferences: Optional[Dict[str, Any]] = None
    deep_questions: Optional[List[Dict[str, Any]]] = None


@app.put("/profile/{user_id}")
async def update_profile(user_id: str, data: ProfileUpdate):
    """
    Updates a user's profile with partial data.
    Only provided (non-None) fields are updated.
    """
    try:
        print(f"[PROFILE] Updating profile for user: {user_id}")

        # 1. Build profile update dict from non-None fields
        profile_fields = {}
        for field in [
            "first_name", "last_name", "age", "gender", "location",
            "pronouns", "pronouns_list", "custom_gender", "hometown",
            "current_job", "company_position", "education_level", "school",
            "height_inches", "ethnicity", "religion", "political_leaning",
            "has_children", "family_plans", "drinking_frequency",
            "cannabis_frequency", "tobacco_frequency", "other_drugs_frequency",
            "interests", "values", "bio", "is_paused",
        ]:
            value = getattr(data, field)
            if value is not None:
                profile_fields[field] = value

        if profile_fields:
            supabase.table("user_profiles").update(profile_fields).eq("id", user_id).execute()

        # 2. Update preferences if provided
        if data.preferences is not None:
            pref_data = {"user_id": user_id, **data.preferences}
            supabase.table("user_preferences").upsert(
                pref_data, on_conflict="user_id"
            ).execute()

        # 3. Update photos if provided (replace all)
        if data.photos is not None:
            supabase.table("user_photos").delete().eq("user_id", user_id).execute()
            for i, photo in enumerate(data.photos):
                url = photo.get("url", "")
                supabase.table("user_photos").insert({
                    "user_id": user_id,
                    "url": url,
                    "storage_path": url.split("/")[-1] if url else "",
                    "display_order": photo.get("order", i),
                    "is_main": photo.get("isMain", i == 0),
                }).execute()

        if data.deep_questions is not None:
            for dq in data.deep_questions:
                supabase.table("deep_question_answers").upsert({
                    "user_id": user_id,
                    "question_id": dq.get("question_id") or dq.get("questionId"),
                    "question_text": dq.get("question_text") or dq.get("question"),
                    "answer_text": dq.get("answer_text") or dq.get("answer"),
                    "tier": dq.get("tier", 1),
                }, on_conflict="user_id, question_id").execute()

        return {"status": "success", "message": "Profile updated"}

    except Exception as e:
        print(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
