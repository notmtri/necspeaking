import os
import json
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv
import psycopg2

load_dotenv()

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

# Connect to database
DATABASE_URL = os.getenv('DATABASE_URL')
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Read existing samples metadata
metadata_file = 'uploads/samples/metadata.json'
with open(metadata_file, 'r', encoding='utf-8') as f:
    samples = json.load(f)

# Upload each sample
for sample in samples:
    filename = sample['filename']
    filepath = f"uploads/samples/{filename}"
    
    if not os.path.exists(filepath):
        print(f"❌ File not found: {filename}")
        continue
    
    print(f"Uploading {filename}...")
    
    # Upload to Cloudinary
    result = cloudinary.uploader.upload(
        filepath,
        resource_type="video",
        folder="necs_samples",
        public_id=f"sample_{sample['id']}"
    )
    
    # Insert into database
    cur.execute("""
        INSERT INTO samples (filename, topic, question, speaker, score, duration, transcript, feedback, audio_url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        sample['filename'],
        sample['topic'],
        sample.get('question', ''),
        sample['speaker'],
        sample['score'],
        sample.get('duration', 0),
        sample['transcript'],
        sample['feedback'],
        result['secure_url']
    ))
    
    print(f"✅ Uploaded: {result['secure_url']}")

conn.commit()
cur.close()
conn.close()

print(f"\n✅ Migrated {len(samples)} samples!")