import boto3
import os
import re
from typing import List, Dict, Any, Optional

class ComprehendService:
    """
    Service for Natural Language Processing using AWS Comprehend and local keyword filtering.
    """
    def __init__(self):
        self.access_key = os.getenv("AWS_ACCESS_KEY_ID")
        self.secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.region = os.getenv("AWS_REGION", "us-east-1")
        
        self.enabled = bool(self.access_key and self.secret_key)
        self.client = None
        
        if self.enabled:
            print("[ComprehendService] Initializing AWS Comprehend client.")
            self.client = boto3.client(
                "comprehend",
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region
            )
        else:
            print("[ComprehendService] WARNING: AWS credentials not found. API calls will be simulated.")

        # Load banned phrases
        self.banned_phrases = self._load_banned_phrases()

    def _load_banned_phrases(self) -> List[str]:
        """Loads phrases from the resources directory."""
        resource_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "resources", "banned_phrases.txt")
        phrases = []
        if os.path.exists(resource_path):
            with open(resource_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        phrases.append(line.lower())
        return phrases

    def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """
        Analyzes the sentiment of a given text using AWS Comprehend.
        """
        if not self.enabled or not self.client:
            return {"sentiment": "NEUTRAL", "sentiment_score": {"Neutral": 1.0}, "simulated": True}
        
        try:
            # Comprehend requires at least 1 character and has a limit
            if not text or len(text.strip()) == 0:
                return {"sentiment": "NEUTRAL", "error": "Empty text"}

            response = self.client.detect_sentiment(Text=text, LanguageCode="en")
            return {
                "sentiment": response.get("Sentiment"),
                "sentiment_score": response.get("SentimentScore")
            }
        except Exception as e:
            print(f"[ComprehendService] Error analyzing sentiment: {e}")
            return {"sentiment": "UNKNOWN", "error": str(e)}

    def detect_pii(self, text: str) -> Dict[str, Any]:
        """
        Detects Personally Identifiable Information (PII) using AWS Comprehend.
        """
        if not self.enabled or not self.client:
            return {"pii_detected": False, "entities": [], "simulated": True}
        
        try:
            response = self.client.detect_pii_entities(Text=text, LanguageCode="en")
            entities = response.get("Entities", [])
            return {
                "pii_detected": len(entities) > 0,
                "entities": entities
            }
        except Exception as e:
            print(f"[ComprehendService] Error detecting PII: {e}")
            return {"pii_detected": False, "error": str(e)}

    def check_banned_phrases(self, text: str) -> Dict[str, Any]:
        """
        Checks if the text contains any banned phrases.
        """
        lower_text = text.lower()
        found = []
        
        for phrase in self.banned_phrases:
            # Using regex for word boundaries to avoid partial matches (e.g., 'date' in 'update')
            pattern = r'\b' + re.escape(phrase) + r'\b'
            if re.search(pattern, lower_text):
                found.append(phrase)
        
        return {
            "flagged": len(found) > 0,
            "matched_phrases": found,
            "message": "Text contains restricted phrases." if found else "Text is clean."
        }

    def moderate_content(self, text: str) -> Dict[str, Any]:
        """
        Performs a full moderation check: Sentiment, PII, and Banned Phrases.
        """
        sentiment = self.analyze_sentiment(text)
        pii = self.detect_pii(text)
        banned = self.check_banned_phrases(text)
        
        # High level logic: flag if it has PII or contains banned phrases
        is_safe = not pii.get("pii_detected") and not banned.get("flagged")
        
        return {
            "is_safe": is_safe,
            "sentiment": sentiment,
            "pii": pii,
            "banned_check": banned
        }

if __name__ == "__main__":
    # Quick test
    service = ComprehendService()
    test_text = "Hey, do you want to go out on a date? Send me money via Venmo."
    results = service.moderate_content(test_text)
    print(f"Text Analysis Results:\n{results}")
