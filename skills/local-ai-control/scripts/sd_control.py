import requests
import base64
import sys
import json
import time

SD_URL = "http://127.0.0.1:7860/sdapi/v1"

def generate(prompt, negative_prompt="", steps=20, cfg_scale=7, width=512, height=512, sampler_name="Euler a"):
    payload = {
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "steps": steps,
        "cfg_scale": cfg_scale,
        "width": width,
        "height": height,
        "sampler_name": sampler_name,
        "override_settings": {
             "sd_model_checkpoint": "juggernaut_xl.safetensors"
        }
    }
    
    response = requests.post(f"{SD_URL}/txt2img", json=payload)
    if response.status_code == 200:
        r = response.json()
        for i, img_data in enumerate(r['images']):
            with open(f"output_{int(time.time())}_{i}.png", "wb") as f:
                f.write(base64.b64decode(img_data))
        print("Success: Images saved.")
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        generate(sys.argv[1])
    else:
        print("Usage: python sd_control.py <prompt>")
