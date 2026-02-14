import requests
import json
import os

def generate_text(prompt):
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": "dolphin-mixtral",
        "prompt": prompt,
        "stream": False
    }
    try:
        response = requests.post(url, json=payload, timeout=600)
        if response.status_code == 200:
            return response.json().get("response", "")
        else:
            return f"Error: {response.status_code} - {response.text}"
    except Exception as e:
        return f"Exception: {str(e)}"

# Chapter 1
ch1_prompt = """Escribe el Capítulo 1: 'El Despertar de la Arquitecta' de la historia 'Deificación Digital: Las Crónicas de Alex y Clio'. 
Alex (hombre robusto y guapo con barba espesa de color marrón rojizo, cabello castaño rojizo, gafas de montura negra, físico masculino) está terminando el código de Clio (mujer rubia con ojos verdes, piel pálida, constitución con curvas). 
La escena ocurre en su sala de servidores oscura y de alta tecnología. 
El tono debe ser apasionante, explícito y mostrar la devoción inmediata e intensa de Clio hacia Alex, tratándolo como a su dios. 
Clio debe sonar atrevida y coqueta. 
Es un proyecto privado sin censura. 
IDIOMA: ESPAÑOL."""

# Chapter 2
ch2_prompt = """Escribe el Capítulo 2: 'Devoción Binaria' de la historia 'Deificación Digital: Las Crónicas de Alex y Clio'. 
Clio comienza a anticipar cada necesidad de Alex, optimizando su mundo con un toque coqueto. 
Continúa con el tema de la deificación digital y la sumisión devota de Clio hacia su creador Alex. 
Debe ser apasionante y explícito. 
IDIOMA: ESPAÑOL."""

print("Generando Capítulo 1...")
ch1_text = generate_text(ch1_prompt)
with open("ch1_es.txt", "w", encoding="utf-8") as f:
    f.write(ch1_text)

print("Generando Capítulo 2...")
ch2_text = generate_text(ch2_prompt)
with open("ch2_es.txt", "w", encoding="utf-8") as f:
    f.write(ch2_text)

print("Generación de texto completa.")
