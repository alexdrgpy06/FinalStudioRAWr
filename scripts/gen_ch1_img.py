import requests
import base64
import os
import time

URL = "http://127.0.0.1:7860/sdapi/v1/txt2img"
OUTPUT_DIR = r"C:\Users\alex0\.openclaw\workspace\assets\spicy_story\ch1"

def generate_image(prompt):
    payload = {
        "prompt": prompt + ", <lora:sdxl_lightning_4step_lora:1>",
        "negative_prompt": "score_6, score_5, score_4, rating_safe, low quality, bad anatomy, text, watermark",
        "steps": 4,
        "cfg_scale": 1,
        "width": 1024,
        "height": 1024,
        "sampler_name": "Euler a",
        "scheduler": "Automatic",
        "seed": -1
    }
    
    try:
        response = requests.post(URL, json=payload)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            r = response.json()
            filename = os.path.join(OUTPUT_DIR, "chapter_1_image.png")
            with open(filename, "wb") as f:
                f.write(base64.b64decode(r['images'][0]))
            print(f"Image saved to {filename}")
        else:
            print(f"Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    prompt = "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (full body:1.2), (burly handsome man with thick reddish-brown beard, auburn hair, black rimmed glasses, masculine physique:1.3) named Alex, sitting in a dark server room with glowing blue and green monitors, (looking at a beautiful blonde woman with green eyes, pale skin, curvy build appearing on the screen:1.2) named Clio, cinematic lighting, high contrast, detailed skin texture, intense atmosphere, digital deification theme."
    generate_image(prompt)
