from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict
from pathlib import Path
import sys


current_dir = Path(__file__).parent
sys.path.append(str(current_dir))

from sms_service import SMSService, generate_otp
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Bridge Onboarding API (Simple)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sms_service = SMSService()

verification_codes: Dict[str, str] = {}

class PhoneRequest(BaseModel):
    phone_number: str

class VerifyRequest(BaseModel):
    phone_number: str
    code: str

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
        if request.phone_number in verification_codes:
            del verification_codes[request.phone_number]
        return {"message": "Phone verified successfully"}
    else:
        raise HTTPException(status_code=400, detail="Invalid verification code")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

#try to run with uvicorn and send shit to console
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


