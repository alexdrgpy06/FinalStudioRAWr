"""
Script to list available models in Google AI Studio.
Requires GOOGLE_API_KEY environment variable or key as first argument.
"""
import os
import sys
from google import genai

def list_models(api_key):
    """
    Connects to Google GenAI and lists all models accessible with the provided API key.
    
    Args:
        api_key (str): The Google AI Studio API key.
    """
    try:
        client = genai.Client(api_key=api_key)
        print(f"{'Model Name':<40} | {'Supported Actions'}")
        print("-" * 70)
        for model in client.models.list():
            actions = ", ".join(model.supported_actions)
            print(f"{model.name:<40} | {actions}")
    except Exception as e:
        print(f"Error listing models: {e}")

if __name__ == "__main__":
    # Priority: Command line arg > Environment Variable
    api_key = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("GOOGLE_API_KEY")
    
    if not api_key:
        print("Error: No API key provided via argument or GOOGLE_API_KEY environment variable.")
        sys.exit(1)
        
    list_models(api_key)
