import requests
import base64

URL = "http://127.0.0.1:7860/sdapi/v1/txt2img"

payload = {
    "prompt": "score_9, score_8_up, score_7_up, rating_explicit, a beautiful blonde woman, green eyes, pale skin",
    "steps": 20,
    "cfg_scale": 1.0,
    "width": 1024,
    "height": 1024,
    "sampler_name": "Euler",
    "scheduler": "Simple",
    "override_settings": {
        "sd_model_checkpoint": "NSFW_MASTER_FLUX.safetensors"
    }
}

try:
    print("Generating with NSFW_MASTER_FLUX...")
    response = requests.post(URL, json=payload, timeout=600)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        with open("test_nsfw_flux.png", "wb") as f:
            f.write(base64.b64decode(response.json()['images'][0]))
        print("Success")
    else:
        print(response.text)
except Exception as e:
    print(f"Error: {e}")
