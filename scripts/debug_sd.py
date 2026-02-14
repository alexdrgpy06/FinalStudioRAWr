import json
import base64
import requests

URL = "http://127.0.0.1:7860/sdapi/v1/txt2img"

payload = {
    "prompt": "score_9, score_8_up, rating_explicit, (blonde woman:1.1)",
    "steps": 20,
    "cfg_scale": 7,
    "width": 1024,
    "height": 1024,
    "sampler_name": "Euler a",
    "scheduler": "Automatic"
}

try:
    response = requests.post(URL, json=payload, timeout=300)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("Success")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Exception: {e}")
