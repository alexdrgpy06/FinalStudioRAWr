"""
Script for a localized generation session using Stable Diffusion WebUI API.
"""
import requests
import base64
import os

SD_URL = os.environ.get("SD_API_URL", "http://127.0.0.1:7860/sdapi/v1")

def generate_and_save(session, prompt, filename):
    """Generates an image via SD API and saves it."""
    payload = {
        "prompt": prompt,
        "negative_prompt": "cartoon, drawing, anime, blurry, low quality, distorted, deformed, (lowres:1.2), (bad anatomy:1.2), (bad hands:1.2)",
        "steps": 30,
        "cfg_scale": 8,
        "width": 1024,
        "height": 1024,
        "sampler_name": "DPM++ 2M Karras",
        "override_settings": {
             "sd_model_checkpoint": "juggernaut_xl.safetensors"
        }
    }
    
    try:
        print(f"Generating: {filename}...")
        response = session.post(f"{SD_URL}/txt2img", json=payload, timeout=300)
        response.raise_for_status()
        
        r = response.json()
        img_data = r['images'][0]
        with open(filename, "wb") as f:
            f.write(base64.b64decode(img_data))
        print(f"Saved: {filename}")
        return True
    except Exception as e:
        print(f"Error generating {filename}: {e}")
        return False

def main():
    prompts = [
        ("Masterpiece, 8k, photorealistic, cinematic lighting, full body shot of a stunning blonde woman, green eyes, pale skin, curvy build, wearing a skin-tight translucent white futuristic bodysuit with glowing blue fiber-optic lines, leaning against a glowing server rack in a dark data center, hand reaching out towards camera, alluring expression, explicit detail, intricate skin texture, bokeh background", "clio_local_1.png"),
        ("Masterpiece, 8k, photorealistic, cinematic lighting, shot from behind looking at a stunning blonde woman, green eyes, pale skin, curvy build, standing on a rainy luxury balcony overlooking a neon cyberpunk city, wearing a thin soaking wet red silk dress that clings to her body, looking over her shoulder with an alluring gaze, explicit silhouette, rain droplets on skin, neon reflections, highly detailed", "clio_local_2.png"),
        ("Masterpiece, 8k, photorealistic, extreme close-up shot of a stunning blonde woman, green eyes, pale skin, curvy build, sitting on a high-tech diagnostic chair in a dark lab, wearing only minimal glowing neon tech-harness, intricate mechanical parts integrated into skin, alluring and submissive expression, sweat on skin, soft blue and pink neon light, explicit details, 8k resolution", "clio_local_3.png")
    ]
    
    with requests.Session() as session:
        for p, f in prompts:
            generate_and_save(session, p, f)

if __name__ == "__main__":
    main()
