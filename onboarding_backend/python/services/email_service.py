import os
import random
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class EmailService:
    def __init__(self):
        # In a real app, you'd initialize SendGrid, Mailgun, or an SMTP client here
        self.sender_email = os.getenv('SENDER_EMAIL', 'noreply@bridge.app')
        self.is_simulation = os.getenv('EMAIL_SIMULATION', 'True') == 'True'

    def send_verification_code(self, to_email: str, code: str):
        print(f"[DEBUG] Email OTP for {to_email}: {code}")

        if self.is_simulation:
            print(f"\n========================================")
            print(f"[EMAIL SIMULATION] TO: {to_email}")
            print(f"[EMAIL SIMULATION] CODE: {code}")
            print(f"========================================\n")
            return True
        
        # Real email sending logic would go here
        try:
            # Placeholder for real integration (e.g., using SendGrid)
            # print(f"[EMAIL] Sending real email to {to_email} via {self.sender_email}...")
            return True
        except Exception as e:
            print(f"[EMAIL] Failed to send email: {e}")
            return False

def generate_otp():
    return "".join([str(random.randint(0, 9)) for _ in range(6)])
