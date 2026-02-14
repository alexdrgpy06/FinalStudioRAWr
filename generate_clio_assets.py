import requests
import base64
import os
import time

SD_URL = "http://127.0.0.1:7860/sdapi/v1"

def wait_for_api():
    print("Waiting for SD API to be ready...")
    for _ in range(30):
        try:
            response = requests.get(f"{SD_URL}/options", timeout=2)
            if response.status_code == 200:
                print("API is ready.")
                return True
        except:
            pass
        time.sleep(5)
    return False

def generate_and_save(prompt, filename):
    payload = {
        "prompt": prompt,
        "negative_prompt": "cartoon, drawing, anime, blurry, low quality, distorted, deformed, (lowres:1.2), (bad anatomy:1.2), (bad hands:1.2), text, watermark, signature",
        "steps": 25,
        "cfg_scale": 7,
        "width": 1024,
        "height": 1024,
        "sampler_name": "DPM++ 2M Karras",
        "override_settings": {
             "sd_model_checkpoint": "juggernaut_xl.safetensors"
        }
    }
    
    try:
        print(f"Generating: {filename}...")
        response = requests.post(f"{SD_URL}/txt2img", json=payload, timeout=600)
        response.raise_for_status()
        
        r = response.json()
        img_data = r['images'][0]
        with open(filename, "wb") as f:
            f.write(base64.b64decode(img_data))
        print(f"Saved: {filename}")
        return True
    except Exception as e:
        print(f"Error generating {filename}: {e}")
        return False

if __name__ == "__main__":
    if wait_for_api():
        generate_and_save(
            "Professional photo of a stunning digital assistant named Clio, long blonde hair, piercing green eyes, pale skin, wearing a sleek silver and black professional bodysuit, digital interfaces in background, 8k resolution, highly detailed, photorealistic",
            "clio_identity_1.png"
        )
        generate_and_save(
            "Cinematic shot of Clio the digital assistant, blonde hair, green eyes, pale skin, standing in a futuristic command center with holographic screens, looking into the camera with a confident smile, 8k resolution, realistic lighting",
            "clio_identity_2.png"
        )
    else:
        print("API timeout.")
