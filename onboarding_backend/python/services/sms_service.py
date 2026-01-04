import os
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

class SMSService:
    def __init__(self):
        self.account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
        self.auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
        self.verify_service_sid = os.environ.get("TWILIO_VERIFY_SERVICE_SID")
        
        if self.account_sid and self.auth_token:
            self.client = Client(self.account_sid, self.auth_token)
        else:
            self.client = None

    def send_verification_code(self, phone_number: str):
        """Sends an OTP to the phone number via Twilio Verify"""
        if not self.client or not self.verify_service_sid:
            print(f"[MOCK] Sending SMS code to {phone_number}: 123456")
            return True
            
        try:
            verification = self.client.verify.v2.services(self.verify_service_sid) \
                .verifications \
                .create(to=phone_number, channel='sms')
            return verification.status == 'pending'
        except Exception as e:
            print(f"Error sending SMS: {e}")
            return False

    def verify_code(self, phone_number: str, code: str):
        """Verifies the OTP code for the phone number"""
        if not self.client or not self.verify_service_sid:
            print(f"[MOCK] Verifying code {code} for {phone_number}")
            return code == "123456"
            
        try:
            verification_check = self.client.verify.v2.services(self.verify_service_sid) \
                .verification_checks \
                .create(to=phone_number, code=code)
            return verification_check.status == 'approved'
        except Exception as e:
            print(f"Error verifying SMS: {e}")
            return False
