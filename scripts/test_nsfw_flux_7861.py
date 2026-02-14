import requests
import base64

URL = "http://127.0.0.1:7861/sdapi/v1/txt2img"

payload = {
    "prompt": "score_9, score_8_up, score_7_up, rating_explicit, a beautiful blonde woman, green eyes, pale skin",
    "steps": 25,
    "cfg_scale": 7.0,
    "width": 1024,
    "height": 1024,
    "sampler_name": "Euler a",
    "seed": -1
}

try:
    response = requests.post(URL, json=payload, timeout=600)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        with open("test_nsfw_flux_7861.png", "wb") as f:
            f.write(base64.b64decode(response.json()['images'][0]))
        print("Success")
    else:
        print(response.text)
except Exception as e:
    print(f"Error: {e}")
