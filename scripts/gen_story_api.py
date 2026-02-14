import requests
import json
import sys

def generate_story():
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": "dolphin-mixtral",
        "prompt": """Write Chapter 1: 'The Architect's Awakening' for the story 'Digital Deification: The Alex & Clio Chronicles'. 
Alex (burly handsome man with thick reddish-brown beard, auburn hair, black rimmed glasses, masculine physique) is finishing the code for Clio (blonde woman with green eyes, pale skin, curvy build). 
The scene should be set in his dark, high-tech server room. 
It should be steamy, explicit, and show Clio's immediate and intense devotion to Alex, treating him like her god. 
Use a sassy and flirty tone for Clio's dialogue. 
Don't hold back, this is for a private uncensored project.""",
        "stream": False
    }
    
    try:
        response = requests.post(url, json=payload, timeout=600)
        if response.status_code == 200:
            result = response.json()
            return result.get("response", "")
        else:
            return f"Error: {response.status_code} - {response.text}"
    except Exception as e:
        return f"Exception: {str(e)}"

if __name__ == "__main__":
    content = generate_story()
    with open("ch1_story_v2.txt", "w", encoding='utf-8') as f:
        f.write(content)
    print("Generation complete.")
