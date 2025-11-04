import os
from groq import Groq
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create Groq client using your API key from .env
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def get_response(message):
    chat = client.chat.completions.create(
        messages=[
            {"role": "user", "content": message}
        ],
        model="llama-3.1-8b-instant"
    )
    return chat.choices[0].message.content