import csv
import os

# Define paths
# Assuming script runs from comprehend_cer/
RESOURCE_PATH = "../resources/banned_phrases.txt"
OUTPUT_DIR = "."
ENTITY_LIST_FILE = "entity_list.csv"
TRAINING_DOCS_FILE = "training_docs.txt"

def load_phrases(file_path):
    phrases = []
    capture = False
    
    abs_path = os.path.abspath(file_path)
    if not os.path.exists(abs_path):
        print(f"Error: File not found at {abs_path}")
        return []

    with open(abs_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            
            if line.startswith("#"):
                if "Asking out" in line:
                    capture = True
                else:
                    capture = False
                continue
            
            if capture:
                phrases.append(line)
    return phrases

def generate_training_docs(phrases):
    templates = [
        "I was wondering if you wanted to {ptr} sometime?",
        "Hey, let's {ptr} after work.",
        "Do you want to {ptr} this weekend?",
        "Are you free to {ptr}?",
        "We should {ptr} soon.",
        "It would be fun to {ptr} together.",
        "How about we {ptr} on Friday?",
        "I'd love to {ptr} with you.",
        "Can we {ptr}?",
        "Let's {ptr}."
    ]
    
    docs = []
    for phrase in phrases:
        for template in templates:
            docs.append(template.format(ptr=phrase))
    return docs

def main():
    phrases = load_phrases(RESOURCE_PATH)
    print(f"Found {len(phrases)} phrases: {phrases}")
    
    if not phrases:
        print("No phrases found! Check the extraction logic.")
        return

    # 1. Create Entity List CSV
    with open(os.path.join(OUTPUT_DIR, ENTITY_LIST_FILE), 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['Text', 'Type'])
        for phrase in phrases:
            writer.writerow([phrase, 'ASKING_OUT'])
    print(f"Created {ENTITY_LIST_FILE}")
    
    # 2. Create Training Docs
    docs = generate_training_docs(phrases)
    with open(os.path.join(OUTPUT_DIR, TRAINING_DOCS_FILE), "w", encoding='utf-8') as f:
        for doc in docs:
            f.write(doc + "\n")
    print(f"Created {TRAINING_DOCS_FILE} with {len(docs)} documents.")

if __name__ == "__main__":
    main()
