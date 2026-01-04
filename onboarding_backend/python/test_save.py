import requests
import json

url = "http://localhost:8000/onboarding/save-step"
data = {
    "user_id": "00000000-0000-0000-0000-000000000001",
    "step_key": "terminal_import",
    "data": {
        "cannabisFrequency": "",
        "drinkingFrequency": "",
        "gender": [],
        "interestedInGenders": [],
        "interests": [],
        "lifestyle": {},
        "nonNegotiables": [],
        "otherDrugsFrequency": "",
        "phoneNumber": "(949) 232-6834",
        "photos": [],
        "preferences": {
            "ageMax": 32,
            "ageMin": 24,
            "heightMax": 84,
            "heightMin": 60
        },
        "preferredEthnicities": [],
        "pronounsList": [],
        "tobaccoFrequency": "",
        "values": []
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
