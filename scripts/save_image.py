import json
import base64
import os

with open('scripts/response_submission.json', 'r') as f:
    data = json.load(f)

if 'images' in data:
    for i, img_data in enumerate(data['images']):
        with open(f'assets/clio_submission.png', 'wb') as f:
            f.write(base64.b64decode(img_data))
    print("Success")
else:
    print("No images found")
