import time
from deepface import DeepFace
def deep_age(img_path):
    print("[DeepFace] Start: Analyzing age...", flush=True)
    start_time = time.perf_counter()
    # enforce_detection=False prevents it from throwing an error if a face isn't perfectly clear
    analysis = DeepFace.analyze(img_path = img_path, actions = ['age'], enforce_detection=False)
    end_time = time.perf_counter()
    print(f"[DeepFace] Success: Age analysis took {end_time - start_time:.2f}s", flush=True)
    return (analysis[0]['age'], end_time - start_time)

# print(deep_age("img.jpg"))