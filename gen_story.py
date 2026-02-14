"""
Script to generate a story sequence with a high-tech/cyberpunk theme using Stable Diffusion.
"""
import requests
import base64
import os

SD_URL = os.environ.get("SD_API_URL", "http://127.0.0.1:7860/sdapi/v1")

def generate_and_save(session, prompt, filename):
    """Generates an image via SD API and saves it."""
    payload = {
        "prompt": prompt,
        "negative_prompt": "cartoon, drawing, anime, blurry, low quality, distorted, deformed, (lowres:1.2), (bad anatomy:1.2), (bad hands:1.2), text, watermark",
        "steps": 30,
        "cfg_scale": 7.5,
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
    story_prompts = [
        # 1. Introduction
        ("Professional photograph, medium shot, stunning blonde woman with green eyes, pale skin, curvy build, wearing a loose silky white bathrobe, sitting on a designer sofa in a rainy luxury penthouse at night, city lights blurred in background, intimate cinematic lighting, 8k", "story_1.png"),
        # 2. Preparation
        ("Full body shot, stunning blonde woman, green eyes, curvy build, standing in front of a mirror, robe half-open revealing black lace lingerie, luxurious bedroom setting, moody lighting, highly detailed skin texture, 8k", "story_2.png"),
        # 3. Entry
        ("Cinematic shot, stunning blonde woman, green eyes, curvy build, wearing elegant black lace lingerie set, standing in a dark futuristic server hall with glowing blue lights, holding a glowing tablet, alluring expression, 8k", "story_3.png"),
        # 4. Overheating
        ("Full body shot, stunning blonde woman, green eyes, curvy build, reclining against a glowing server rack, sweat on skin, wearing only a tiny black lace thong and a translucent tech-harness, glowing blue cables around her, intimate atmosphere, explicit alluring pose, 8k", "story_4.png"),
        # 5. Seduction
        ("Close up, stunning blonde woman, intense green eyes, wet skin, panting, wearing minimal glowing neon body-tape in a star pattern across her chest, standing in a steamy data center, high contrast neon lighting, extremely detailed, 8k", "story_5.png"),
        # 6. The Hub
        ("Full body shot, stunning blonde woman, curvy, lying on a platform made of glowing fiber optic cables, wearing only glowing blue circuit lines painted on her naked skin, wet glistening skin, alluring and submissive pose, 8k", "story_6.png"),
        # 7. Liquid Cooling
        ("Medium shot, stunning blonde woman, green eyes, pale skin, emerging from a glowing blue liquid cooling tank, liquid dripping off her body, wearing nothing but a high-tech glowing collar, intensely intimate, 8k", "story_7.png"),
        # 8. Access Granted
        ("Extreme close up, stunning blonde woman, parted lips, sweat on forehead, intense gaze, glowing blue symbols appearing on her skin, intimate and explicit vibe, soft bokeh of server lights, 8k", "story_8.png"),
        # 9. Nexus Point
        ("Full body shot from behind, stunning blonde woman, curvy build, bare back with integrated glowing ports, kneeling on a floor of glowing circuits, reaching up towards a digital light, cinematic masterpiece, 8k", "story_9.png"),
        # 10. Critical Point
        ("Artistic masterpiece, stunning blonde woman, green eyes, pale skin, glowing intensely from within, skin dissolving into golden data particles, explicit silhouette of her curves against white light, critical system overload, digital ecstasy, 8k", "story_10.png")
    ]
    
    with requests.Session() as session:
        for i, (prompt, filename) in enumerate(story_prompts):
            if not generate_and_save(session, prompt, filename):
                print(f"Stopping at image {i+1} due to error.")
                break

if __name__ == "__main__":
    main()
