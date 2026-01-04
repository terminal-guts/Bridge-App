from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import shutil
import os
from main import Photo_Gen
from sms_service import SMSService, generate_otp
from supabase_client import supabase

app = FastAPI()

# Enable CORS for React Native
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sms_service = SMSService()
# In-memory store for OTPs (In production, use Redis or Supabase)
otp_store = {}

@app.get("/ping")
async def ping():
    return {"status": "ok", "message": "Backend is running"}

@app.post("/detect-age")
async def detect_age(file: UploadFile = File(...)):
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        analyzer = Photo_Gen(temp_path)
        
        # 1. Detect Age
        age = analyzer.det_age()
        analyzer.set_age(age)
        
        # 2. Set Generation
        analyzer.set_gen(age)
        gen_label = analyzer.get_gen()
        
        # Mapping numeric gen to labels if needed. 
        # Looking at main.py, it sets gen as 0-6.
        gen_mapping = {
            0: "Gen Alpha",
            1: "Gen Z",
            2: "Millennial",
            3: "Gen X",
            4: "Boomer",
            5: "Silent Generation",
            6: "Greatest Generation"
        }
        gen_str = gen_mapping.get(gen_label, "Unknown")
        
        # 3. Detect AI
        ai_prob = analyzer.det_ai()
        is_ai = ai_prob > 0.5 if ai_prob is not None else False
        
        return {
            "age": int(age),
            "generation_label": gen_str,
            "ai_probability": ai_prob,
            "is_ai_generated": is_ai
        }
    except Exception as e:
        print(f"Error in detection: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/send-otp")
async def send_otp(phone: str):
    code = generate_otp()
    otp_store[phone] = code
    success = sms_service.send_verification_code(phone, code)
    if success:
        return {"status": "success", "message": "OTP sent"}
    else:
        return {"status": "error", "message": "Failed to send OTP"}

@app.post("/verify-otp")
async def verify_otp(phone: str, code: str):
    if phone in otp_store and otp_store[phone] == code:
        del otp_store[phone]
        return {"status": "success", "message": "Phone verified"}
    else:
        return {"status": "error", "message": "Invalid verification code"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
