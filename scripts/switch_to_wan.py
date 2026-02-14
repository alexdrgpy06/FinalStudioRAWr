import requests
url = "http://127.0.0.1:7860/sdapi/v1/options"
payload = {"sd_model_checkpoint": "WAN_2.2_High.safetensors"}
r = requests.post(url, json=payload)
print(r.json())
