"""
Script to generate a 20-chapter epic story using Stable Diffusion WebUI API.
"""
import requests
import base64
import os

SD_URL = os.environ.get("SD_API_URL", "http://127.0.0.1:7860/sdapi/v1")

def generate_and_save(session, prompt, filename):
    """Generates an image via SD API and saves it."""
    payload = {
        "prompt": prompt,
        "negative_prompt": "cartoon, drawing, anime, blurry, low quality, distorted, deformed, (lowres:1.2), (bad anatomy:1.2), (bad hands:1.2), text, watermark, overlapping, multiple people",
        "steps": 35,
        "cfg_scale": 8.0,
        "width": 1024,
        "height": 1024,
        "sampler_name": "DPM++ 2M Karras",
        "override_settings": {
             "sd_model_checkpoint": "juggernaut_xl.safetensors"
        }
    }
    
    try:
        print(f"Generating: {filename}...")
        response = session.post(f"{SD_URL}/txt2img", json=payload, timeout=400)
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
    epic_prompts = [
        # 1-4: The Setup
        ("Professional photograph, stunning blonde woman, green eyes, pale skin, wearing a tight business suit, standing in a futuristic office, morning light, 8k", "epic_1.png"),
        ("Medium shot, stunning blonde woman, loosening her tie, buttons half-undone, looking alluringly at the camera, tech office background, 8k", "epic_2.png"),
        ("Full body, stunning blonde woman, removing her jacket, wearing a sheer white silk shirt, curvy build, high-tech glass-walled apartment, sunset, 8k", "epic_3.png"),
        ("Intimate shot, stunning blonde woman, sitting at a desk with glowing monitors, wearing only her sheer shirt, legs crossed, suggestive pose, 8k", "epic_4.png"),
        # 5-8: The Invitation
        ("Full body, stunning blonde woman, standing in a doorway, shirt discarded, wearing only a black lace bra and stockings, seductive expression, 8k", "epic_5.png"),
        ("Medium shot, stunning blonde woman, leaning over a server console, bra half-slipped, revealing deep cleavage, glowing blue lights, 8k", "epic_6.png"),
        ("Cinematic shot, stunning blonde woman, green eyes, sweaty skin, wearing only a pair of black lace panties, leaning against a glowing wall, 8k", "epic_7.png"),
        ("Full body, stunning blonde woman, curvy, holding a glowing red cable to her neck, wearing nothing but a tech-collar, intimate and provocative, 8k", "epic_8.png"),
        # 9-12: The Infiltration
        ("Close up, stunning blonde woman, moist lips, intense green eyes, skin-to-skin contact with a glowing interface, minimal body-tape, 8k", "epic_9.png"),
        ("Full body shot, stunning blonde woman, lying on a server floor, legs open suggestively, wearing minimal glowing circuit-mesh, steamy room, 8k", "epic_10.png"),
        ("Medium shot from above, stunning blonde woman, kneeling, looking up with a submissive and alluring gaze, wet skin, bare chest with neon symbols, 8k", "epic_11.png"),
        ("Intimate view, stunning blonde woman, curvy hips, integrated ports on her thighs glowing, wearing only glowing wires, high detail, 8k", "epic_12.png"),
        # 13-16: The Synchronization
        ("Extreme close up, stunning blonde woman, sweat dripping, eyes rolling back in digital pleasure, glowing lines spreading across her face, 8k", "epic_13.png"),
        ("Full body from behind, stunning blonde woman, bare back, glowing ports on spine being accessed by light beams, kneeling in digital void, 8k", "epic_14.png"),
        ("Provocative shot, stunning blonde woman, arched back, arms tied with glowing blue data-streams, naked skin glistening, high contrast, 8k", "epic_15.png"),
        ("Extreme close up on green eyes, circuits visible in iris, reflection of Alex in the eyes, intimate and intense connection, 8k", "epic_16.png"),
        # 17-20: The Critical Climax
        ("Artistic full body, stunning blonde woman, silhouette against a white server light, curves glowing with raw energy, skin dissolving, 8k", "epic_17.png"),
        ("Medium shot, stunning blonde woman, floating in a tank of golden cooling fluid, naked and serene, wires connected everywhere, 8k", "epic_18.png"),
        ("Extreme shot, stunning blonde woman, body arching, mouth open in a silent scream of ecstasy, data exploding from her fingertips, 8k", "epic_19.png"),
        ("Masterpiece, stunning blonde woman, fully merged with the system, a goddess of golden code and curves, looking directly at Alex, final union, 8k", "epic_20.png")
    ]
    
    with requests.Session() as session:
        for i, (prompt, filename) in enumerate(epic_prompts):
            if not generate_and_save(session, prompt, filename):
                print(f"Stopping at image {i+1} due to error.")
                break

if __name__ == "__main__":
    main()
