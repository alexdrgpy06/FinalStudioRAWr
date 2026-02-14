import requests
import base64

URL = "http://127.0.0.1:7861/sdapi/v1/txt2img"

payload = {
    "prompt": "a beautiful blonde woman, green eyes, pale skin",
    "steps": 20,
    "cfg_scale": 1.0,
    "width": 512,
    "height": 512,
    "sampler_name": "Euler",
    "scheduler": "Simple",
    "override_settings": {
        "sd_model_checkpoint": "Fluxed_Up.safetensors"
    }
}

try:
    response = requests.post(URL, json=payload, timeout=600)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        with open("test_flux_7861.png", "wb") as f:
            f.write(base64.b64decode(response.json()['images'][0]))
        print("Success")
    else:
        print(response.text)
except Exception as e:
    print(f"Error: {e}")
