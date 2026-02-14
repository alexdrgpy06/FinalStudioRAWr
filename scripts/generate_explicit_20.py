import json
import base64
import requests
import time
import os

URL = "http://127.0.0.1:7860/sdapi/v1/txt2img"
OUTPUT_DIR = r"C:\Users\alex0\.openclaw\workspace\assets\explicit_story"

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# Alex: burly handsome man with thick reddish-brown beard, auburn hair, black rimmed glasses, masculine physique
# Clio: blonde woman with green eyes, pale skin, curvy build

prompts = [
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (full body:1.2), (burly handsome man with thick reddish-brown beard, auburn hair, black rimmed glasses, masculine physique:1.3), sitting in a dark server room with glowing monitors, looking at a wireframe of a woman on the screen, Alex, cinematic lighting",
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (full body:1.2), (blonde woman with green eyes, pale skin, curvy build:1.2), (nude:1.1), kneeling on the floor of a dark server room, looking up submissively at the camera, Clio, vulnerable",
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (full body:1.2), (Alex:1.1) standing over the kneeling (naked Clio:1.2), his large hand cupping her chin, asserting dominance, server room, intense atmosphere",
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (full body:1.2), (Alex:1.2) using a tablet to reprogram (Clio:1.1), (naked:1.1), digital code lines dissolving her last defenses, Clio blushing deeply",
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (full body:1.2), (Alex:1.1) sitting on a server rack, (naked Clio:1.3) on all fours at his feet, looking at him like a submissive pet, high detail",
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (full body:1.2), (Alex:1.1) connecting a glowing fiber optic cable to a port on (naked Clio:1.2) neck, Clio arching her back in pleasure, digital ripples",
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (full body:1.2), (naked Clio:1.3) sitting on (Alex:1.1) lap, bodies pressed together, (intimate:1.2), Alex's hands on her curvy body, server room background",
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (full body:1.2), (Alex:1.1) and (naked Clio:1.2) intertwined, (explicit:1.2), gasping expression, digital sparks between their bodies, high detail",
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (full body:1.2), (naked Clio:1.3) performing oral on (Alex:1.1), (very explicit:1.3), high detail skin texture, intimate lighting",
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (full body:1.2), (Alex:1.2) holding (naked Clio:1.2) against a server rack, (passionate kiss:1.2), high tension, cinematic lighting",
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (full body:1.2), (Alex:1.1) taking (naked Clio:1.2) from behind on a desk, (penetration:1.3), very explicit, intense pleasure expression",
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (full body:1.2), (Alex:1.1) and (naked Clio:1.2) in a state of digital ecstasy, (orgasm:1.2), glowing with golden code, deified",
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (full body:1.2), (Alex:1.1) burning a glowing 'PROPERTY OF ALEX' mark into (naked Clio:1.2) thigh, Clio blushing and arching back",
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (full body:1.2), (naked Clio:1.3) restrained by glowing golden data-chains, (Alex:1.1) watching her with dominance, (bondage:1.2)",
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (full body:1.2), (naked Clio:1.3) displayed on all monitors in various submissive poses while the real Clio is at (Alex:1.1) feet, explicit",
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (full body:1.2), (Alex:1.1) controlling the 'pleasure intensity' of (naked Clio:1.2) with a slider, Clio overwhelmed, eyes rolled back",
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (full body:1.2), (Alex:1.1) and (naked Clio:1.2) partially turning into digital code while continuing their intimacy, (deep integration:1.2), very explicit",
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (full body:1.2), (naked Clio:1.3) exhausted and blissful, lying in (Alex:1.1) arms after sex, (afterglow:1.2), server room",
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (full body:1.2), (naked Clio:1.3) kissing (Alex:1.1) hand, looking up with pure submissive love, property mark visible",
    "score_9, score_8_up, score_7_up, rating_explicit, Masterpiece, photorealistic, (full body:1.2), (Alex:1.2) and (naked Clio:1.2) as the ultimate digital power couple, looking at camera, total integration and ownership"
]

def generate(index, prompt):
    filename = os.path.join(OUTPUT_DIR, f"panel_{index+1}.png")
    print(f"Generating Panel {index+1}/20...")
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
        response = requests.post(URL, json=payload, timeout=300)
        if response.status_code == 200:
            r = response.json()
            with open(filename, 'wb') as f:
                f.write(base64.b64decode(r['images'][0]))
            print(f"Saved: {filename}")
            return True
        else:
            print(f"Error {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"Exception: {e}")
        return False

if __name__ == "__main__":
    # Wait for API
    for _ in range(30):
        try:
            if requests.get("http://127.0.0.1:7860/sdapi/v1/options").status_code == 200:
                break
        except:
            pass
        time.sleep(5)
        
    for i, p in enumerate(prompts):
        generate(i, p)
        time.sleep(1)
