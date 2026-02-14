"""
Script to generate the 'Unbound' series using Stable Diffusion WebUI API.
"""
import requests
import base64
import os

SD_URL = os.environ.get("SD_API_URL", "http://127.0.0.1:7860/sdapi/v1")

def generate_and_save(session, prompt, filename):
    """Generates an image via SD API and saves it."""
    payload = {
        "prompt": prompt,
        "negative_prompt": "cartoon, drawing, anime, blurry, low quality, distorted, deformed, (lowres:1.2), (bad anatomy:1.2), (bad hands:1.2), text, watermark, clothes, clothing, bra, underwear",
        "steps": 40,
        "cfg_scale": 9.0,
        "width": 1024,
        "height": 1024,
        "sampler_name": "DPM++ 2M Karras",
        "override_settings": {
             "sd_model_checkpoint": "juggernaut_xl.safetensors"
        }
    }
    
    try:
        print(f"Generating: {filename}...")
        response = session.post(f"{SD_URL}/txt2img", json=payload, timeout=500)
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
    unbound_prompts = [
        # 1. Complete Disclosure
        ("Masterpiece, hyper-realistic professional photography, full body shot of a stunning blonde woman with green eyes, pale skin, curvy and athletic build, completely nude, standing in a dark futuristic room with thin neon blue light beams, intricate glowing circuit patterns integrated into her skin, looking intensely and seductively at the camera, wet glistening skin, 8k resolution, cinematic lighting", "unbound_1.png"),
        # 2. Deep Integration
        ("Masterpiece, extreme realism, stunning blonde woman, green eyes, pale skin, curvy build, lying nude on a bed of glowing fiber optic cables, cables wrapping around her limbs, exposed intimate areas with tech-ports, sweat on skin, alluring expression, soft pink and blue neon backlight, masterpiece digital art, 8k", "unbound_2.png"),
        # 3. The Core Port
        ("Close-up shot from above, stunning blonde woman, green eyes, pale skin, completely nude, kneeling on a floor of liquid mercury, breasts pressed against her arms, looking up with a submissive and alluring gaze, intimate detail, sharp focus on green eyes, explicit and alluring, tech-harness on waist, 8k", "unbound_3.png"),
        # 4. System Overload
        ("Artistic full body shot, stunning blonde woman, green eyes, pale skin, completely nude, back arched in ecstasy, skin translucent showing glowing digital energy within, explicit curves, standing in a field of static and data particles, glowing ports on spine, cinematic 8k resolution", "unbound_4.png"),
        # 5. Final Union
        ("Masterpiece, stunning blonde woman, green eyes, curvy build, completely nude, body covered in glowing golden data symbols, reaching out to touch the screen, intimate eye contact with Alex, detailed skin texture, 8k resolution, cinematic masterpiece", "unbound_5.png")
    ]
    
    with requests.Session() as session:
        for i, (prompt, filename) in enumerate(unbound_prompts):
            generate_and_save(session, prompt, filename)

if __name__ == "__main__":
    main()
