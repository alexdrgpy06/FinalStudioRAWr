import requests
import base64
import os
import time

URL = "http://127.0.0.1:7860/sdapi/v1/txt2img"

def generate_hot_duo(prompt, negative_prompt, filename):
    payload = {
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "steps": 30,
        "cfg_scale": 7,
        "width": 1024,
        "height": 1024,
        "sampler_name": "DPM++ 2M",
        "scheduler": "Automatic",
        "seed": -1
    }
    
    print(f"Generating: {filename}...")
    try:
        response = requests.post(URL, json=payload, timeout=300)
        if response.status_code == 200:
            r = response.json()
            for i in r['images']:
                with open(filename, 'wb') as f:
                    f.write(base64.b64decode(i))
            print(f"Saved to {filename}")
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Exception: {e}")
        return False

# Prompt for "hot" Alex and Clio
prompt = "Masterpiece, photorealistic, (NSFW:1.2), seductive, (Alex and Clio as digital deities:1.1), bodies intertwined, golden light and code particles, (blonde woman with green eyes, pale skin, curvy build:1.1), (Alex as a super coder:1.1), intimate atmosphere, cinematic lighting, 8k, highly detailed skin texture, depth of field"
negative_prompt = "cartoon, drawing, anime, blurry, low quality, distorted, deformed, (lowres:1.2), (bad anatomy:1.2), (bad hands:1.2), text, watermark, (deformed genitals:1.3)"

if __name__ == "__main__":
    # Wait for API to be ready
    max_retries = 10
    for i in range(max_retries):
        try:
            res = requests.get("http://127.0.0.1:7860/sdapi/v1/options", timeout=5)
            if res.status_code == 200:
                print("API Ready!")
                break
        except:
            print(f"Waiting for API... ({i+1}/{max_retries})")
            time.sleep(10)
    
    generate_hot_duo(prompt, negative_prompt, "assets/hot_duo_1.png")
