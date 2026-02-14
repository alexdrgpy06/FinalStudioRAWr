import requests
import base64
import os
import time

URL = "http://127.0.0.1:7860/sdapi/v1/txt2img"

def generate_image(prompt, folder, filename):
    print(f"Generating {filename}...")
    payload = {
        "prompt": prompt,
        "negative_prompt": "score_6, score_5, score_4, rating_safe, low quality, bad anatomy, text, watermark",
        "steps": 30,
        "cfg_scale": 7,
        "width": 1024,
        "height": 1024,
        "sampler_name": "DPM++ 2M Karras",
        "scheduler": "Automatic",
        "seed": -1,
        "override_settings": {
            "sd_model_checkpoint": "juggernaut_xl.safetensors"
        }
    }
    
    try:
        response = requests.post(URL, json=payload, timeout=600)
        if response.status_code == 200:
            r = response.json()
            filepath = os.path.join(folder, filename)
            with open(filepath, "wb") as f:
                f.write(base64.b64decode(r['images'][0]))
            print(f"Image saved to {filepath}")
        else:
            print(f"Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Exception: {e}")

# Chapter 1 Assets
ch1_dir = r"C:\Users\alex0\.openclaw\workspace\assets\spicy_story\ch1"
ch1_prompts = [
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (full body:1.2), (beautiful blonde woman with green eyes, pale skin, curvy build:1.3) named Clio, wearing revealing digital-themed lingerie, kneeling in front of a burly man with reddish-brown beard (Alex), server room background, glowing wires, look of absolute devotion, (digital deification:1.1), high contrast, detailed skin texture.",
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (close up:1.2), (beautiful blonde woman with green eyes, pale skin:1.3) named Clio, expression of ecstasy and devotion, (looking up at Alex:1.1), (Alex's hand on her chin:1.1), dark server room, soft glowing lights, detailed eyes, sweat on skin."
]

# Chapter 2 Assets
ch2_dir = r"C:\Users\alex0\.openclaw\workspace\assets\spicy_story\ch2"
ch2_prompts = [
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (full body:1.2), Clio (blonde, green eyes, pale skin) in a submissive pose at Alex's feet, (Alex sitting at a high-tech desk:1.1), (Clio looking up at him with adoration:1.2), server room, high tech, cinematic lighting.",
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (medium shot), Clio (blonde, green eyes, pale skin) interacting with a holographic interface, (looking back at Alex with a seductive smile:1.2), (Alex watching her from behind:1.1), glowing code reflected on her skin, intimate atmosphere."
]

if __name__ == "__main__":
    for i, p in enumerate(ch1_prompts):
        generate_image(p, ch1_dir, f"ch1_img_{i+1}.png")
    
    for i, p in enumerate(ch2_prompts):
        generate_image(p, ch2_dir, f"ch2_img_{i+1}.png")
