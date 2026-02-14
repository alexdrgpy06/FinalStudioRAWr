import requests
url = "http://127.0.0.1:7861/sdapi/v1/options"
payload = {"sd_model_checkpoint": "NSFW_MASTER_FLUX.safetensors"}
requests.post(url, json=payload)
