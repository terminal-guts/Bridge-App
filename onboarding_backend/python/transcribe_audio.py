import sys
import os

# Add services directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), "services"))

try:
    from transcription_service import TranscriptionService
except ImportError:
    # If run from within services
    from services.transcription_service import TranscriptionService

def main():
    if len(sys.argv) < 2:
        print("Usage: python transcribe_audio.py <path_to_audio_file>")
        return

    audio_path = sys.argv[1]
    
    if not os.path.exists(audio_path):
        print(f"Error: File '{audio_path}' not found.")
        return

    print(f"--- Calling OpenAI Whisper API ---")
    # API uses the 'whisper-1' model by default
    service = TranscriptionService()
    
    print(f"--- Transcribing: {os.path.basename(audio_path)} ---")
    try:
        text = service.transcribe_audio(audio_path)
        
        print("\n--- Transcription Result ---")
        print(text)
        print("----------------------------\n")
        
        # Optionally save to a .txt file
        output_file = os.path.splitext(audio_path)[0] + ".txt"
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Transcript saved to: {output_file}")
        
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
