import requests
import json

url = "http://localhost:8000/onboarding/save-step"
data = {
    "user_id": "a715d2c8-cb4d-4b14-855d-3e7eba1e0e6c",
    "step_key": "terminal_test_preferences",
    "data": {
        "phoneNumber": "(949) 232-1234",
        "preferences": {
            "ageMax": 35,
            "ageMin": 21,
            "heightMax": 80,
            "heightMin": 60,
            "preferredGender": "female",
            "lookingFor": "relationship",
            "distanceMiles": 25
        }
    }
}

try:
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    try:
        print(f"Response JSON: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Raw Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
