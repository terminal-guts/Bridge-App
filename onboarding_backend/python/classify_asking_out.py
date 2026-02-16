"""
Bridge — Asking Out Classifier (Batch Job)

Uses AWS Comprehend StartDocumentClassificationJob to classify
chat messages as ASKING_OUT or NEUTRAL using your pre-trained
custom classifier model.

BEFORE RUNNING:
  1. Replace the placeholder variables below (or set them in .env)
  2. Upload asking_out_labels.csv to your S3 bucket (the script can do it for you)
  3. Make sure your Comprehend custom classifier is TRAINED and shows
     status = "TRAINED" in the AWS Console

USAGE:
  python classify_asking_out.py                   # submit job
  python classify_asking_out.py --status JOB_ID   # check job status
  python classify_asking_out.py --upload           # upload input file to S3 first
"""

import boto3
import os
import sys
import json
import time
import csv
from io import StringIO
from dotenv import load_dotenv

load_dotenv()

# ============================================================================
# >>> CHANGE THESE <<<
# ============================================================================

# Your AWS credentials (or set in .env / environment)
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "your_key_id")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "your_secret_key")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

# Your S3 bucket where Comprehend reads input and writes output
S3_BUCKET = os.getenv("COMPREHEND_BUCKET_NAME", "your-s3-bucket-name")

# S3 paths (you can leave these as-is)
S3_INPUT_KEY = "comprehend/asking_out/input/messages.txt"
S3_OUTPUT_PREFIX = "comprehend/asking_out/output/"

# Your trained custom classifier ARN from the AWS Console
# Go to: AWS Console > Comprehend > Custom classification > Your model
# Copy the ARN that looks like:
#   arn:aws:comprehend:us-east-1:123456789012:document-classifier/asking-out-classifier
CLASSIFIER_ARN = os.getenv(
    "COMPREHEND_ASKING_OUT_CLASSIFIER_ARN",
    "arn:aws:comprehend:us-east-1:YOUR_ACCOUNT_ID:document-classifier/YOUR_CLASSIFIER_NAME"
)

# IAM Role ARN that Comprehend assumes to read/write S3
# This role needs: AmazonComprehendFullAccess + S3 read/write on your bucket
COMPREHEND_ROLE_ARN = os.getenv(
    "COMPREHEND_ROLE_ARN",
    "arn:aws:iam::YOUR_ACCOUNT_ID:role/YourComprehendRole"
)

# ============================================================================
# Clients
# ============================================================================

s3 = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION,
)

comprehend = boto3.client(
    "comprehend",
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION,
)


# ============================================================================
# Upload input file to S3
# ============================================================================

def upload_input_file(messages: list[str] = None):
    """
    Upload a one-doc-per-line text file to S3 for batch classification.
    If no messages provided, uses sample messages from the CSV.
    """
    if messages is None:
        # Pull sample texts from the CSV for a test run
        csv_path = os.path.join(
            os.path.dirname(__file__), "resources", "asking_out_labels.csv"
        )
        messages = []
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                messages.append(row["TEXT"])

    # Comprehend batch expects ONE_DOC_PER_LINE format
    body = "\n".join(messages)

    print(f"[UPLOAD] Uploading {len(messages)} messages to s3://{S3_BUCKET}/{S3_INPUT_KEY}")
    s3.put_object(
        Bucket=S3_BUCKET,
        Key=S3_INPUT_KEY,
        Body=body.encode("utf-8"),
        ContentType="text/plain",
    )
    print("[UPLOAD] Done.")


# ============================================================================
# Start classification job
# ============================================================================

def start_classification_job(job_name: str = None) -> str:
    """
    Starts a Comprehend batch document classification job.
    Returns the JobId.
    """
    if job_name is None:
        job_name = f"asking-out-classify-{int(time.time())}"

    print(f"[JOB] Starting classification job: {job_name}")
    print(f"  Classifier : {CLASSIFIER_ARN}")
    print(f"  Input      : s3://{S3_BUCKET}/{S3_INPUT_KEY}")
    print(f"  Output     : s3://{S3_BUCKET}/{S3_OUTPUT_PREFIX}")
    print(f"  Role       : {COMPREHEND_ROLE_ARN}")

    response = comprehend.start_document_classification_job(
        JobName=job_name,
        DocumentClassifierArn=CLASSIFIER_ARN,
        InputDataConfig={
            "S3Uri": f"s3://{S3_BUCKET}/{S3_INPUT_KEY}",
            "InputFormat": "ONE_DOC_PER_LINE",
        },
        OutputDataConfig={
            "S3Uri": f"s3://{S3_BUCKET}/{S3_OUTPUT_PREFIX}",
        },
        DataAccessRoleArn=COMPREHEND_ROLE_ARN,
    )

    job_id = response["JobId"]
    status = response["JobStatus"]

    print(f"\n[JOB] Submitted successfully!")
    print(f"  JobId  : {job_id}")
    print(f"  Status : {status}")
    print(f"\nCheck status with:")
    print(f"  python classify_asking_out.py --status {job_id}")

    return job_id


# ============================================================================
# Check job status
# ============================================================================

def check_job_status(job_id: str):
    """Check the status of a classification job and print results if complete."""
    response = comprehend.describe_document_classification_job(JobId=job_id)
    job = response["DocumentClassificationJobProperties"]

    status = job["JobStatus"]
    print(f"[STATUS] Job {job_id}")
    print(f"  Status  : {status}")

    if status == "COMPLETED":
        output_uri = job["OutputDataConfig"]["S3Uri"]
        print(f"  Output  : {output_uri}")
        print(f"\n[STATUS] Job completed! Download results from the S3 URI above.")
        print(f"  The output is a tar.gz containing a JSON file with predictions.")

    elif status == "FAILED":
        message = job.get("Message", "No error message")
        print(f"  Error   : {message}")

    elif status in ("SUBMITTED", "IN_PROGRESS"):
        print(f"  The job is still running. Check again in a few minutes.")

    return status


# ============================================================================
# Classify a single message in real-time (uses the endpoint, not batch)
# ============================================================================

def classify_single_message(text: str, endpoint_arn: str = None) -> dict:
    """
    Classify a single message in real-time using a deployed Comprehend endpoint.

    NOTE: This requires a DEPLOYED endpoint (not just a trained model).
    Deploying an endpoint costs ~$100/month minimum.
    For real-time use in chat, you may want this instead of batch.

    To deploy an endpoint:
      AWS Console > Comprehend > Endpoints > Create endpoint
    Then set COMPREHEND_ASKING_OUT_ENDPOINT_ARN in your .env
    """
    if endpoint_arn is None:
        endpoint_arn = os.getenv(
            "COMPREHEND_ASKING_OUT_ENDPOINT_ARN",
            ""
        )
    if not endpoint_arn:
        print("[WARN] No endpoint ARN set. Use batch job or deploy an endpoint.")
        return {"error": "No endpoint ARN configured"}

    response = comprehend.classify_document(
        Text=text,
        EndpointArn=endpoint_arn,
    )

    classes = response.get("Classes", [])
    top = max(classes, key=lambda c: c["Score"]) if classes else {}

    return {
        "text": text,
        "label": top.get("Name", "UNKNOWN"),
        "confidence": round(top.get("Score", 0) * 100, 1),
        "all_classes": classes,
    }


# ============================================================================
# CLI
# ============================================================================

if __name__ == "__main__":
    if "--help" in sys.argv or "-h" in sys.argv:
        print(__doc__)
        sys.exit(0)

    if "--upload" in sys.argv:
        upload_input_file()

    elif "--status" in sys.argv:
        idx = sys.argv.index("--status")
        if idx + 1 >= len(sys.argv):
            print("Usage: python classify_asking_out.py --status JOB_ID")
            sys.exit(1)
        check_job_status(sys.argv[idx + 1])

    elif "--classify" in sys.argv:
        idx = sys.argv.index("--classify")
        if idx + 1 >= len(sys.argv):
            print("Usage: python classify_asking_out.py --classify \"Want to grab coffee?\"")
            sys.exit(1)
        result = classify_single_message(sys.argv[idx + 1])
        print(json.dumps(result, indent=2))

    else:
        # Default: upload + start job
        upload_input_file()
        start_classification_job()
