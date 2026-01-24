import boto3
import os
from dotenv import load_dotenv
import sys

# Add current directory to path so we can import prepare_data
sys.path.append(os.path.dirname(__file__))

from prepare_data import load_phrases, RESOURCE_PATH

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

REGION_NAME = os.getenv("AWS_REGION", "us-east-1")

def analyze_text_comprehend(text, endpoint_arn):
    client = boto3.client('comprehend', region_name=REGION_NAME)
    
    response = client.detect_entities(
        Text=text,
        EndpointArn=endpoint_arn
    )
    return response['Entities']

def simple_analysis(text, phrases):
    matches = []
    text_lower = text.lower()
    for phrase in phrases:
        # Check if phrase is in text (case-insensitive)
        if phrase.lower() in text_lower:
            matches.append(phrase)
    return matches

def main():
    # Load phrases for simple analysis
    phrases = load_phrases(RESOURCE_PATH)
    
    # You can change this text to test different inputs
    text_to_analyze = "I was checking if you wanted to grab a coffee tomorrow."
    if len(sys.argv) > 1:
        text_to_analyze = sys.argv[1]
    
    print(f"Analyzing text: '{text_to_analyze}'")
    
    # 1. Simple Analysis (Free, Local)
    print("\n--- Simple Analysis (Exact Match) ---")
    matches = simple_analysis(text_to_analyze, phrases)
    if matches:
        print(f"🚩 FLAG: Restricted phrases detected: {matches}")
    else:
        print("No restricted phrases found (exact match).")
        
    # 2. Comprehend Analysis (Requires Active Endpoint)
    endpoint_arn = os.getenv("COMPREHEND_ENDPOINT_ARN")
    
    print("\n--- Comprehend Analysis (ML Model) ---")
    if endpoint_arn:
        try:
            print(f"Calling Endpoint: {endpoint_arn}...")
            entities = analyze_text_comprehend(text_to_analyze, endpoint_arn)
            if entities:
                print("🚩 FLAG: Attributes detected via Comprehend!")
                for e in entities:
                    print(f" - Found '{e['Text']}' identified as {e['Type']} (Confidence: {e['Score']:.2f})")
            else:
                print("No entities detected by Comprehend.")
        except Exception as e:
            print(f"Comprehend Error: {e}")
    else:
        print("Skipping Comprehend analysis because COMPREHEND_ENDPOINT_ARN is not set in .env")
        print("To use this, Train the model, Create an Endpoint, and set the ARN in .env")

if __name__ == "__main__":
    main()
