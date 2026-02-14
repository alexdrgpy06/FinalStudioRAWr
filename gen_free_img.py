"""
Script to generate images for free using Pollinations.ai.
Useful for quick, cost-free image generation with Flux or other models.
"""
import requests
import urllib.parse
import random
import sys

def generate_free_image(prompt, filename="generated_image.png"):
    """
    Generates an image via Pollinations.ai and saves it locally.

    Args:
        prompt (str): The description of the image.
        filename (str): The name of the file to save.
    """
    seed = random.randint(1, 1000000)
    encoded_prompt = urllib.parse.quote(prompt)
    
    # Using Pollinations.ai with the 'flux' model for high quality
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true&seed={seed}&model=flux"
    
    try:
        print(f"Requesting image from Pollinations.ai (seed: {seed})...")
        response = requests.get(url, timeout=30)
        
        if response.status_code == 200:
            with open(filename, 'wb') as f:
                f.write(response.content)
            print(f"Successfully saved image as: {filename}")
        else:
            print(f"Error: API returned status code {response.status_code}")
            print(f"Details: {response.text[:200]}")
    except requests.exceptions.RequestException as e:
        print(f"Network error during image generation: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        user_prompt = " ".join(sys.argv[1:])
    else:
        # Default realistic photographic prompt
        user_prompt = (
            "Hyper-realistic professional photography, full body shot of a stunning blonde woman, "
            "green eyes, pale skin, curvy build, wearing a sleek black dress, "
            "high-end fashion magazine style, sharp focus, 8k, bokeh background, cinematic lighting"
        )
    
    generate_free_image(user_prompt, "clio_free_retry.png")
