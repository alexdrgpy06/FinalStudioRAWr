"""
Script to generate a series of images telling a duo story using Stable Diffusion WebUI API.
"""
import requests
import base64
import time
import os
import sys

# Configuration from environment or defaults
SD_URL = os.environ.get("SD_API_URL", "http://127.0.0.1:7860/sdapi/v1")

def generate_and_save(session, prompt, filename):
    """
    Sends a request to the SD WebUI API to generate an image.

    Args:
        session (requests.Session): The persistent HTTP session.
        prompt (str): The positive prompt for generation.
        filename (str): The destination filename.
    
    Returns:
        bool: True if successful, False otherwise.
    """
    payload = {
        "prompt": prompt + ", photorealistic, cinematic lighting, masterpiece, 8k, highly detailed skin texture, depth of field",
        "negative_prompt": "cartoon, drawing, anime, blurry, low quality, distorted, deformed, (lowres:1.2), (bad anatomy:1.2), (bad hands:1.2), text, watermark",
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
        response = session.post(f"{SD_URL}/txt2img", json=payload, timeout=600)
        response.raise_for_status()
        
        r = response.json()
        if 'images' in r and r['images']:
            img_data = r['images'][0]
            with open(filename, "wb") as f:
                f.write(base64.b64decode(img_data))
            print(f"Successfully saved: {filename}")
            return True
        else:
            print(f"Error: No images returned in response for {filename}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"Network error for {filename}: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error for {filename}: {e}")
        return False

def main():
    story_prompts = [
        # 1. First Encounter
        ("Cinematic shot of a stunning blonde woman (Clio) in a futuristic office, green eyes, wearing a tight business suit, looking at a techy man with a thick dark beard (Alex) who is sitting at a terminal, high contrast neon lighting", "duo_1.png"),
        # 2. Tech Collaboration
        ("Medium shot of Clio and Alex leaning over a glowing holographic interface, Clio loosening her tie, Alex looking at the screen intensely, server room background, steam and neon", "duo_2.png"),
        # 3. Private Session
        ("Clio sitting on the edge of a high-tech desk in a private lab, Alex standing between her legs, both fully clothed but leaning in close, intimate cinematic lighting", "duo_3.png"),
        # 4. First Layer
        ("Clio removing her business jacket, revealing a sheer white silk blouse, Alex's hand on her waist, dark server room, glowing circuit lines on walls", "duo_4.png"),
        # 5. The Invitation
        ("Full body shot, Clio standing against a server rack, blouse unbuttoned, Alex kissing her neck, intimate and alluring pose, cyberpunk aesthetic", "duo_5.png"),
        # 6. Underneath
        ("Clio in black lace bra and stockings, sitting on Alex's lap in the dark server room, Alex's face buried in her neck, explicit and seductive vibe", "duo_6.png"),
        # 7. Accessing the Core
        ("Clio and Alex embracing on a platform of glowing cables, Clio's bra half-undone, Alex's hand on her bare hip, cinematic 8k", "duo_7.png"),
        # 8. Overheating
        ("Full body shot of Clio and Alex, Clio wearing only a tiny black lace thong, Alex's shirt removed, both glistening with sweat in a steamy data center", "duo_8.png"),
        # 9. Direct Connection
        ("Extreme close up of Clio's face, green eyes glowing, Alex's hands on her cheeks, intimate gaze, explicit and allure, soft neon bokeh", "duo_9.png"),
        # 10. Naked Truth
        ("Full body shot of Clio and Alex, both completely nude, embracing in front of a giant glowing CPU core, intricate glowing circuit patterns on Clio's skin", "duo_10.png"),
        # 11. Data Fusion
        ("Clio lying nude on Alex's chest, both covered in glowing blue light beams, intimate and explicit setting, futuristic bedroom", "duo_11.png"),
        # 12. System Intrusion
        ("Alex accessing ports on Clio's back as she sits nude on a floor of liquid mercury, explicit and allure, techy cyberpunk lab", "duo_12.png"),
        # 13. Sincronía Total
        ("Extreme close up of Alex and Clio kissing, both nude, glowing data lines moving between their skins, high detail, masterpiece", "duo_13.png"),
        # 14. Deep Buffer
        ("Full body shot of Clio arcing her bare back in Alex's arms, both nude, surrounded by swirling data particles, cinematic 8k", "duo_14.png"),
        # 15. Root Access
        ("Clio on all fours on a glass server floor, Alex behind her, both nude, explicit and alluring pose, neon reflections everywhere", "duo_15.png"),
        # 16. Power Surge
        ("Close up of Clio's face, sweat dripping, eyes rolling back, Alex's beard visible in shot, intimate and intense, 8k", "duo_16.png"),
        # 17. Climax of Code
        ("Alex and Clio merged in a sphere of golden light and data, both nude silhouettes, explicit curves, epic cinematic masterpiece", "duo_17.png"),
        # 18. Liquid Cooling Duo
        ("Alex and Clio in a glowing blue cooling tank, both nude, liquid splashing, intimate and alluring gaze, 8k", "duo_18.png"),
        # 19. Critical Point
        ("Full body shot of Clio and Alex in a blinding white light, their bodies dissolving into golden data particles, final critical overload, digital ecstasy", "duo_19.png"),
        # 20. The Sovereigns
        ("Masterpiece, Alex and Clio as digital deities, bodies made of golden light and code, sitting on a throne of server racks, looking directly at the camera, final union", "duo_20.png")
    ]
    
    with requests.Session() as session:
        for i, (prompt, filename) in enumerate(story_prompts):
            success = generate_and_save(session, prompt, filename)
            if not success:
                print(f"Process halted at index {i} due to errors.")
                break

if __name__ == "__main__":
    main()
