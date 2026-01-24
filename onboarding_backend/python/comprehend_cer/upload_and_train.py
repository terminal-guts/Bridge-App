import boto3
import os
from dotenv import load_dotenv

# Load environment variables from parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Configuration
# Users should set these in .env
BUCKET_NAME = os.getenv("COMPREHEND_BUCKET_NAME")
# Use a default role ARN if not set, but it likely won't work without a real one.
ROLE_ARN = os.getenv("COMPREHEND_ROLE_ARN") 
REGION_NAME = os.getenv("AWS_REGION", "us-east-1")

ENTITY_LIST_LOCAL = "entity_list.csv"
TRAINING_DOCS_LOCAL = "training_docs.txt"
S3_ENTITY_KEY = "training-data/entity-list/entity_list.csv"
S3_DOCS_KEY = "training-data/documents/training_docs.txt"
RECOGNIZER_NAME = "AskingOutDetector"

def upload_to_s3(s3_client):
    if not BUCKET_NAME:
        raise ValueError("Bucket name not set. Please set COMPREHEND_BUCKET_NAME in .env")
    
    print(f"Uploading files to bucket: {BUCKET_NAME}")
    
    # Upload Entity List
    if os.path.exists(ENTITY_LIST_LOCAL):
        s3_client.upload_file(ENTITY_LIST_LOCAL, BUCKET_NAME, S3_ENTITY_KEY)
        print(f"Uploaded {ENTITY_LIST_LOCAL} to s3://{BUCKET_NAME}/{S3_ENTITY_KEY}")
    else:
        print(f"Error: {ENTITY_LIST_LOCAL} not found. Run prepare_data.py first.")
        return False

    # Upload Training Docs
    if os.path.exists(TRAINING_DOCS_LOCAL):
        s3_client.upload_file(TRAINING_DOCS_LOCAL, BUCKET_NAME, S3_DOCS_KEY)
        print(f"Uploaded {TRAINING_DOCS_LOCAL} to s3://{BUCKET_NAME}/{S3_DOCS_KEY}")
    else:
        print(f"Error: {TRAINING_DOCS_LOCAL} not found. Run prepare_data.py first.")
        return False
        
    return True

def train_model(comprehend_client):
    if not ROLE_ARN:
        raise ValueError("IAM Role ARN not set. Please set COMPREHEND_ROLE_ARN in .env")

    print(f"Starting training for recognizer: {RECOGNIZER_NAME}")
    
    try:
        response = comprehend_client.create_entity_recognizer(
            RecognizerName=RECOGNIZER_NAME,
            DataAccessRoleArn=ROLE_ARN,
            LanguageCode='en',
            InputDataConfig={
                'EntityTypes': [
                    {'Type': 'ASKING_OUT'}
                ],
                'Documents': {
                    'S3Uri': f's3://{BUCKET_NAME}/training-data/documents/',
                    'InputFormat': 'ONE_DOC_PER_LINE'
                },
                'EntityList': {
                    'S3Uri': f's3://{BUCKET_NAME}/{S3_ENTITY_KEY}'
                }
            }
        )
        print(f"Training started. Job ARN: {response['EntityRecognizerArn']}")
        return response['EntityRecognizerArn']
    except Exception as e:
        print(f"Error starting training: {e}")
        return None

def main():
    if not os.getenv("AWS_ACCESS_KEY_ID"):
        print("Warning: AWS Credentials not found in environment. Please check your .env file.")
    
    try:
        s3 = boto3.client('s3', region_name=REGION_NAME)
        comprehend = boto3.client('comprehend', region_name=REGION_NAME)
        
        if upload_to_s3(s3):
            train_model(comprehend)
            
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
