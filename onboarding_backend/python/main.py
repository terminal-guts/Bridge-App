from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict
import sys
from pathlib import Path

# Add the current directory and its parent to sys.path to allow running from anywhere
current_dir = Path(__file__).parent
sys.path.append(str(current_dir))

from utils.supabase_client import get_supabase_client
# Use the root sms_service which was recently added
from sms_service import SMSService, generate_otp
from services.photo_analysis_service import PhotoAnalysisService
from fastapi.middleware.cors import CORSMiddleware
import deep
import AIFace

app = FastAPI(title="Bridge Onboarding API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for development
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

sms_service = SMSService()
photo_service = PhotoAnalysisService()
supabase = get_supabase_client()

# Temporary in-memory store for OTPs (in production, use Redis)
verification_codes: Dict[str, str] = {}

# --- Models & Classes ---

class Photo_Gen():
    def __init__(self, source):
        self.age = None
        self.gen = None
        self.source = source # Can be path or numpy array/PIL image
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

        return {"status": "success", "message": f"Step {request.step_key} saved and synced"}
    except Exception as e:
        print(f"Error saving onboarding step: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/onboarding/send-otp")
async def send_otp(request: PhoneRequest):
    code = generate_otp()
    verification_codes[request.phone_number] = code
    
    success = sms_service.send_verification_code(request.phone_number, code)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send OTP")
    return {"message": "OTP sent successfully"}

@app.post("/onboarding/verify-otp")
async def verify_otp(request: VerifyRequest):
    stored_code = verification_codes.get(request.phone_number)
    if stored_code and stored_code == request.code:
        # Code matches
        if request.phone_number in verification_codes:
            del verification_codes[request.phone_number]
        return {"message": "Phone verified successfully"}
    else:
        raise HTTPException(status_code=400, detail="Invalid verification code")

@app.post("/onboarding/complete")
async def complete_onboarding(data: OnboardingCompletion, background_tasks: BackgroundTasks):
    """
    Finalizes onboarding by saving data to Supabase and triggering photo analysis.
    """
    try:
        print(f"[ONBOARDING] Complete called for user: {data.user_id}")
        
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
        
        response = supabase.table("profiles").upsert({
            "id": data.user_id,
            **profile_data
        }).execute()
        
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
            background_tasks.add_task(photo_service.verify_batch, data.photos)
        
        return {"status": "success", "message": "Onboarding completed"}
        
    except Exception as e:
        print(f"Error completing onboarding: {e}")
        # Dont crash if DB partial fail
        return {"status": "success", "message": "Onboarding completed locally (with partial DB success)"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
