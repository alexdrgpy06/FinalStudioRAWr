import sys
from google import genai
from google.genai import types
import sys
import os

def generate_image(prompt, api_key):
    """
    Generates an image using Google's Imagen 4 model via the GenAI client.

    Args:
        prompt (str): The text description of the image to generate.
        api_key (str): The Google AI Studio API key.
    """
    client = genai.Client(api_key=api_key)
    
    # Using Imagen 4 Fast via Google AI API (AI Studio)
    model_id = 'imagen-4.0-fast-generate-001' 
    
    try:
        print(f"Generating image for prompt: '{prompt}'...")
        response = client.models.generate_images(
            model=model_id,
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                include_rai_reason=True,
                output_mime_type='image/png',
                person_generation='allow_adult'
            )
        )

        if not response.generated_images:
            print("No images were generated. Check for safety filters or API issues.")
            return

        for i, image in enumerate(response.generated_images):
            filename = f"clio_imagen_{i}.png"
            with open(filename, "wb") as f:
                f.write(image.image_bytes)
            print(f"Successfully saved: {filename}")
    except Exception as e:
        print(f"Error during image generation: {e}")

import os

def main():
    """
    Main execution block to handle CLI arguments and trigger image generation.
    """
    if len(sys.argv) < 2 and not os.environ.get("GOOGLE_API_KEY"):
        prompt = "A stunning blonde woman with green eyes."
    else:
        prompt = sys.argv[1] if len(sys.argv) > 1 else "A stunning blonde woman with green eyes."

    # Priority: Command line arg > Environment Variable
    api_key = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("GOOGLE_API_KEY")

    if not api_key:
        print("Error: No API key provided via argument or GOOGLE_API_KEY environment variable.")
        sys.exit(1)

    generate_image(prompt, api_key)

if __name__ == "__main__":
    main()
