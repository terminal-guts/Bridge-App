import pytest
from fastapi.testclient import TestClient
from main import app, verification_codes

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_phone_otp_flow():
    # 1. Send OTP
    phone = "+19490001234"
    response = client.post("/onboarding/send-otp", json={"phone_number": phone})
    assert response.status_code == 200
    assert phone in verification_codes
    
    code = verification_codes[phone]
    
    # 2. Verify OTP (Wrong code)
    response = client.post("/onboarding/verify-otp", json={"phone_number": phone, "code": "000000"})
    assert response.status_code == 400
    
    # 3. Verify OTP (Right code)
    response = client.post("/onboarding/verify-otp", json={"phone_number": phone, "code": code})
    assert response.status_code == 200
    data = response.json()
    assert "user_id" in data
    assert "is_new_user" in data
    assert phone not in verification_codes

def test_email_otp_flow():
    # 1. Send OTP
    email = "test@bridge.app"
    response = client.post("/onboarding/send-email-otp", json={"email": email})
    assert response.status_code == 200
    assert email in verification_codes
    
    code = verification_codes[email]
    
    # 2. Verify OTP
    response = client.post("/onboarding/verify-email-otp", json={"email": email, "code": code})
    assert response.status_code == 200
    data = response.json()
    assert "user_id" in data
    assert email not in verification_codes

def test_master_code():
    phone = "+19495551212"
    # Use master code 123456
    response = client.post("/onboarding/verify-otp", json={"phone_number": phone, "code": "123456"})
    assert response.status_code == 200
    assert "user_id" in response.json()

def test_save_step_mock():
    # Test skipping Supabase for phone steps
    user_id = "test-uuid"
    response = client.post("/onboarding/save-step", json={
        "user_id": user_id,
        "step_key": "phone_number",
        "data": {"phone_number": "+1234567890"}
    })
    assert response.status_code == 200
    assert "ignored" in response.json()["message"]
