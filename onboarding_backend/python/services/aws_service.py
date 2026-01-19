import boto3
import os
import re
from typing import List, Dict, Any, Optional

class AwsService:
    def __init__(self):
        # AWS Credentials from environment variables
        self.access_key = os.getenv("AWS_ACCESS_KEY_ID")
        self.secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.region = os.getenv("AWS_REGION", "us-east-1")
        
        self.enabled = bool(self.access_key and self.secret_key)
        
        if self.enabled:
            self.rekognition = boto3.client(
                "rekognition",
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region
            )
            self.comprehend = boto3.client(
                "comprehend",
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region
            )
        else:
            print("[WARN] AWS credentials not found. AWS services will be simulated.")

    def moderate_image(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Detects inappropriate content in an image using AWS Rekognition.
        Returns a dict with 'is_safe' (bool) and 'labels' (list).
        """
        if not self.enabled:
            return {"is_safe": True, "labels": [], "simulated": True}
            
        try:
            response = self.rekognition.detect_moderation_labels(
                Image={'Bytes': image_bytes},
                MinConfidence=75
            )
            
            labels = response.get('ModerationLabels', [])
            # Filter for explicit or suggestive content
            unsafe_labels = [l['Name'] for l in labels if l['Name'] in ['Explicit Nudity', 'Suggestive', 'Violence', 'Visually Disturbing']]
            
            return {
                "is_safe": len(unsafe_labels) == 0,
                "labels": unsafe_labels
            }
        except Exception as e:
            print(f"[ERROR] AWS Rekognition error: {e}")
            return {"is_safe": True, "error": str(e)}

    def check_restricted_words(self, text: str, has_voice_memo: bool = False) -> Dict[str, Any]:
        """
        Checks for restricted words if no voice memo is present.
        """
        restricted_patterns = [
            r"\bdate\b",
            r"\bgo\s+out\b",
            r"\bhang\s+out\b",
            r"\bhanging\s+out\b"
        ]
        
        if has_voice_memo:
            return {"allowed": True, "found_words": []}
            
        found_words = []
        for pattern in restricted_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                found_words.extend(matches)
                
        if found_words:
            return {
                "allowed": False,
                "found_words": list(set(found_words)),
                "message": "To keep it personal, please record a voice message if you're asking them out!"
            }
            
        return {"allowed": True, "found_words": []}
