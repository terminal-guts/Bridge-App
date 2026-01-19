import os
from twilio.rest import Client
import random
from dotenv import load_dotenv

from pathlib import Path

# Load environment variables. Try multiple paths.
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path) # Try local .env
load_dotenv() # Fallback to current working directory .env

class SMSService:
    def __init__(self):
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        self.from_number = os.getenv('TWILIO_PHONE_NUMBER')
        
        # Check if credentials are placeholders or missing
        if self.account_sid and self.auth_token and not self.account_sid.startswith('YOUR_'):
            print(f"[SMS] Twilio credentials found ({self.account_sid[:4]}...). Initializing client.")
            self.client = Client(self.account_sid, self.auth_token)
        else:
            print("[SMS] Warning: Twilio credentials missing or are placeholders. Running in SIMULATION mode.")
            self.client = None

    def _clean_number(self, phone: str):
        """Convert (713) 269-3700 to +17132693700"""
        digits = "".join([c for c in phone if c.isdigit()])
        if not digits.startswith('1') and len(digits) == 10:
            return f"+1{digits}"
        if not digits.startswith('+'):
            return f"+{digits}"
        return digits

    def send_verification_code(self, to_number: str, code: str):
        # Convert to E.164 format for Twilio
        to_number = self._clean_number(to_number)
        
        # Always print code for debugging purposes
        print(f"[DEBUG] OTP for {to_number}: {code}")

        if not self.client:
            print(f"\n========================================")
            print(f"[SMS SIMULATION] (No Twilio Credentials)")
            print(f"[SMS SIMULATION] PHONE: {to_number}")
            print(f"[SMS SIMULATION] CODE: {code}")
            print(f"========================================\n")
            return True
        
        try:
            print(f"[SMS] Sending via Twilio From: {self.from_number} To: {to_number}")
            
            message = self.client.messages.create(
                body=f"Your Bridge verification code is: {code}",
                from_=self.from_number,
                to=to_number
            )
            print(f"[SMS] Success! Message SID: {message.sid}")
            print(f"[SMS] Message Status: {message.status}")
            return True
        except Exception as e:
            print(f"\n[SMS] !!! TWILIO FAILURE !!!")
            print(f"[SMS] Error Type: {type(e).__name__}")
            print(f"[SMS] Error Message: {str(e)}")
            if hasattr(e, 'status'):
                print(f"[SMS] Twilio Status Code: {e.status}")
            if hasattr(e, 'code'):
                print(f"[SMS] Twilio Error Code: {e.code}")
            return False

def generate_otp():
    return "".join([str(random.randint(0, 9)) for _ in range(6)])
