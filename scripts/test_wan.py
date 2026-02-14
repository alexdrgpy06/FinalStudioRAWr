import requests
import base64
import time

URL = "http://127.0.0.1:7860/sdapi/v1/txt2img"

def test_wan():
    payload = {
        "prompt": "a beautiful blonde woman smiling, green eyes, pale skin",
        "steps": 5,
        "width": 512,
        "height": 512,
        "override_settings": {
            "sd_model_checkpoint": "WAN_2.2_Low.safetensors"
        }
    }
    print("Testing Wan 2.2 Low...")
    r = requests.post(URL, json=payload, timeout=600)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        print("Done. Images returned:", len(r.json().get('images', [])))
    else:
        print(r.text)

if __name__ == "__main__":
    test_wan()
