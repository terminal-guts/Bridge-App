try:
    import torch
    import torch.nn.functional as F
    from transformers import AutoImageProcessor, AutoModelForImageClassification
except ImportError:
    torch = None
    F = None
    AutoImageProcessor = None
    AutoModelForImageClassification = None

from PIL import Image
import os

# Global variables for Lazy Loading
_MODEL = None
_PROCESSOR = None
_DEVICE = "cuda" if (torch and torch.cuda.is_available()) else "cpu"

def get_ai_probability(image_path):
    """
    Returns a single float (0.0 to 1.0) representing the probability 
    that the image is AI-generated.
    """
    global _MODEL, _PROCESSOR, _DEVICE
    
    # 1. Lazy Load Model
    if _MODEL is None:
        print("[AI Detector] Info: Loading model... (only happens once)", flush=True)
        model_id = "umm-maybe/AI-image-detector"
        _PROCESSOR = AutoImageProcessor.from_pretrained(model_id)
        _MODEL = AutoModelForImageClassification.from_pretrained(model_id)
        _MODEL.to(_DEVICE)
        print(f"[AI Detector] Success: Loaded on {_DEVICE}", flush=True)

    # 2. Process Image
    try:
        print("[AI Detector] Start: Running inference...", flush=True)
        if isinstance(image_path, str):
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image not found: {image_path}")
            image = Image.open(image_path).convert("RGB")
        else:
            # Assume it's already a PIL image or can be converted to one
            image = image_path.convert("RGB") if hasattr(image_path, 'convert') else image_path
            
        inputs = _PROCESSOR(image, return_tensors="pt").to(_DEVICE)

        with torch.no_grad():
            outputs = _MODEL(**inputs)
            logits = outputs.logits

        # 3. Calculate AI Probability
        probs = F.softmax(logits, dim=-1)
        ai_prob = probs[0][0].item()
        print(f"[AI Detector] Success: AI Probability calculated ({ai_prob:.4f})", flush=True)
        return ai_prob

    except Exception as e:
        print(f"[AI Detector] Error: {e}", flush=True)
        return None