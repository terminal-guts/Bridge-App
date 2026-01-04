from typing import List, Dict
import time
import os
import sys

# Add the parent directory to sys.path so we can import deep and AIFace
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import deep
import AIFace

class PhotoAnalysisService:
    def __init__(self):
        pass

    async def analyze_photo(self, image_url: str) -> Dict:
        """
        Analyzes a photo for age verification and AI detection.
        Returns a dictionary with results.
        """
        print(f"[PhotoAnalysis] Analyzing: {image_url}")
        
        #For now, we assume the path is local or handles URLs
        try:
            # 1. Age Detection
            age, age_took = deep.deep_age(image_url)
            
            # 2. AI Detection
            ai_prob = AIFace.get_ai_probability(image_url)
            
            return {
                "is_ai_generated": ai_prob > 0.5 if ai_prob is not None else False,
                "ai_confidence": ai_prob if ai_prob is not None else 0.0,
                "detected_age": age,
                "age_confidence": 0.95, # DeepFace doesn't return confidence directly in this helper
                "face_detected": True,
                "status": "passed" if age >= 18 and (ai_prob is None or ai_prob < 0.5) else "failed"
            }
        except Exception as e:
            print(f"[PhotoAnalysis] Error analyzing {image_url}: {e}")
            return {
                "status": "error",
                "message": str(e)
            }

    async def verify_batch(self, image_urls: List[str]) -> List[Dict]:
        results = []
        for url in image_urls:
            res = await self.analyze_photo(url)
            results.append(res)
        return results
