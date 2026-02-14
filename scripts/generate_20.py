import json
import base64
import requests
import time
import os

URL = "http://127.0.0.1:7860/sdapi/v1/txt2img"
OUTPUT_DIR = "assets/duo_20_hot"

with open('scripts/payload_batch.json', 'r') as f:
    payload = json.load(f)

def generate(index):
    filename = f"{OUTPUT_DIR}/duo_hot_{index}.png"
    print(f"Generating {index}/20...")
    try:
        response = requests.post(URL, json=payload, timeout=300)
        if response.status_code == 200:
            r = response.json()
            for i, img_data in enumerate(r['images']):
                with open(filename, 'wb') as f:
                    f.write(base64.b64decode(img_data))
            print(f"Saved: {filename}")
            return True
        else:
            print(f"Error {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"Exception: {e}")
        return False

if __name__ == "__main__":
    for i in range(1, 21):
        success = generate(i)
        if not success:
            print("Stopping due to error.")
            break
        time.sleep(1)
