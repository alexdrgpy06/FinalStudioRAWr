import requests
import json

url = "http://127.0.0.1:7860/sdapi/v1/options"
payload = {"sd_model_checkpoint": "Fluxed_Up.safetensors"}
response = requests.post(url, json=payload)
print(response.json())
