import sys
import os

# Add the project directory to Python path
project_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_dir)

from dotenv import load_dotenv
from api.chat import get_response

# Load environment variables from .env
load_dotenv()

def main():
    print("SpeakUp AI – type 'quit' or 'exit' to stop.\n")
    while True:
        user_msg = input("You: ")
        if user_msg.lower() in ["quit", "exit"]:
            print("Goodbye!")
            break
        
        reply = get_response(user_msg)
        print("AI:", reply)

if __name__ == "__main__":
    main()