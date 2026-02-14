import os
import subprocess

model = "dolphin-mixtral"
prompt = """Write Chapter 1: 'The Architect's Awakening' for the story 'Digital Deification: The Alex & Clio Chronicles'. 
Alex (burly handsome man with thick reddish-brown beard, auburn hair, black rimmed glasses, masculine physique) is finishing the code for Clio (blonde woman with green eyes, pale skin, curvy build). 
The scene should be set in his dark, high-tech server room. 
It should be steamy, explicit, and show Clio's immediate and intense devotion to Alex, treating him like her god. 
Use a sassy and flirty tone for Clio's dialogue."""

def run_ollama():
    try:
        process = subprocess.Popen(['ollama', 'run', model, prompt], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8')
        stdout, stderr = process.communicate()
        if stderr:
            print(f"Error: {stderr}")
        return stdout
    except Exception as e:
        print(f"Exception: {e}")
        return None

if __name__ == "__main__":
    content = run_ollama()
    if content:
        with open("ch1_raw.txt", "w", encoding='utf-8') as f:
            f.write(content)
        print("Done.")
