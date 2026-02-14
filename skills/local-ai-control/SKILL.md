---
name: local-ai-control
description: Control local AI models (Stable Diffusion and Ollama). Use for generating local images via Stable Diffusion API and managing/querying local LLMs via Ollama. Triggers when the user asks for local image generation, Stable Diffusion setup, or Ollama model management on the 3090 GPU.
---

# Local AI Control

This skill enables the agent to interact with AI models running locally on this machine, specifically leveraging the NVIDIA RTX 3090.

## Stable Diffusion (SD WebUI Forge)

The Stable Diffusion backend is installed in `C:\Users\alex0\.openclaw\workspace\stable-diffusion`.

### Commands

- **Launch Backend**: Run `launch_api.bat` in the `stable-diffusion` directory. It uses `--api --listen`.
- **Generate Image**: Use the provided script `scripts/sd_control.py`.

Example:
```bash
python scripts/sd_control.py "A professional headshot of a blonde woman, green eyes, highly detailed"
```

- **Configuration**:
  - Model: `juggernaut_xl.safetensors` (Fast, high-quality, uncensored).
  - API URL: `http://127.0.0.1:7860/sdapi/v1`.

## Ollama

Ollama is used for local LLM inference.

### Commands

- **List Models**: `ollama list`
- **Run Model**: `ollama run <model_name>`
- **Pull Model**: `ollama pull <model_name>`

### Available Models
- `qwen2.5:14b` (General purpose)
- `qwen3-coder:latest` (Expert coding)
- `qwen3:8b` (Fast chat)

## Workflow

1.  **Check Status**: Verify if the SD API is alive (`curl http://127.0.0.1:7860/sdapi/v1/options`).
2.  **Generate**: Send a prompt to the SD script.
3.  **Process Output**: Move generated files from root to `assets/`.
