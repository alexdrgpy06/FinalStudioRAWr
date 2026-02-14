@echo off
set token=6f6b6beb3a4a1dc2da320867bccb2523
start /b curl.exe -L -H "Authorization: Bearer %token%" "https://civitai.com/api/download/models/2577735" -o "C:\Users\alex0\.openclaw\workspace\stable-diffusion\models\Stable-diffusion\Fluxed_Up.safetensors"
