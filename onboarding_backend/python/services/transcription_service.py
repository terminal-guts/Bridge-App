import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class TranscriptionService:
    """
    Service for transcribing audio files using OpenAI's Whisper API (Cloud).
    Requires: pip install openai
    """
    
    _instance = None
    _client = None

    def __new__(cls):
        """Singleton pattern to avoid re-initializing the client multiple times."""
        if cls._instance is None:
            cls._instance = super(TranscriptionService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        """
        Initialize the transcription service using the OpenAI API.
        Ensure OPENAI_API_KEY is set in your environment variables.
        """
        if TranscriptionService._client is None:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                print("[TranscriptionService] WARNING: OPENAI_API_KEY not found in environment.")
            
            print("[TranscriptionService] Initializing OpenAI Cloud API client.")
            TranscriptionService._client = OpenAI(api_key=api_key)

    def transcribe_audio(self, audio_file_path: str, language: str = None) -> str:
        """
        Transcribe an audio file to text using OpenAI Whisper API.
        
        Args:
            audio_file_path (str): The local path to the audio file.
            language (str, optional): The language of the audio (e.g., 'en', 'es'). 
            
        Returns:
            str: The transcribed text.
        """
        if not os.path.exists(audio_file_path):
            raise FileNotFoundError(f"Audio file not found at: {audio_file_path}")

        print(f"[TranscriptionService] Sending file to OpenAI API: {os.path.basename(audio_file_path)}")
        
        try:
            with open(audio_file_path, "rb") as audio_file:
                # Using the v1/audio/transcriptions endpoint
                response = TranscriptionService._client.audio.transcriptions.create(
                    model="whisper-1", 
                    file=audio_file,
                    language=language if language else None
                )
            
            transcribed_text = response.text.strip()
            print(f"[TranscriptionService] Transcription complete.")
            return transcribed_text
        except Exception as e:
            print(f"[TranscriptionService] Error during API transcription: {e}")
            raise e

# Example of how to use this service
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        try:
            service = TranscriptionService()
            text = service.transcribe_audio(file_path)
            print("-" * 30)
            print(f"Transcription Results:\n{text}")
            print("-" * 30)
        except Exception as e:
            print(f"Error: {e}")
    else:
        print("Usage: python transcription_service.py <audio_file_path>")
        print("Note: Ensure you have 'OPENAI_API_KEY' set in your .env file.")
