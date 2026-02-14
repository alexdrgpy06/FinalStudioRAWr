@echo off
set token=6f6b6beb3a4a1dc2da320867bccb2523
start /b curl.exe -L -C - -H "Authorization: Bearer %token%" "https://civitai.com/api/download/models/2577735" -o "C:\Users\alex0\.openclaw\workspace\stable-diffusion\models\Stable-diffusion\Fluxed_Up.safetensors"
start /b curl.exe -L -C - -H "Authorization: Bearer %token%" "https://civitai.com/api/download/models/2607212" -o "C:\Users\alex0\.openclaw\workspace\stable-diffusion\models\Stable-diffusion\NSFW_MASTER_FLUX.safetensors"
start /b curl.exe -L -C - -H "Authorization: Bearer %token%" "https://civitai.com/api/download/models/2653561" -o "C:\Users\alex0\.openclaw\workspace\stable-diffusion\models\Lora\SNOFS.safetensors"
start /b curl.exe -L -C - -H "Authorization: Bearer %token%" "https://civitai.com/api/download/models/2679329" -o "C:\Users\alex0\.openclaw\workspace\stable-diffusion\models\Lora\Pov_sex_looking_down.safetensors"
start /b curl.exe -L -C - -H "Authorization: Bearer %token%" "https://civitai.com/api/download/models/2668710" -o "C:\Users\alex0\.openclaw\workspace\stable-diffusion\models\Stable-diffusion\WAN_2.2_High.safetensors"
start /b curl.exe -L -C - -H "Authorization: Bearer %token%" "https://civitai.com/api/download/models/2668712" -o "C:\Users\alex0\.openclaw\workspace\stable-diffusion\models\Stable-diffusion\WAN_2.2_Low.safetensors"
