# ClioBulk: Professional Edition 📸🚀

**High-Performance Local Photo Processor for Professionals.**

ClioBulk Professional Edition is a cutting-edge, 100% local image processing powerhouse. Designed for photographers and creators who demand speed, privacy, and precision, ClioBulk leverages the full power of your hardware without ever uploading a single byte to the cloud.

## 🌟 Professional Features

### ⚡ Native Performance Engine
- **Tauri + Rust Backend**: Harnesses the speed of Rust for intensive image operations.
- **Multithreaded Processing**: Intelligent concurrency management using logical CPU core detection and semaphores.
- **Rayon Integration**: Parallelized pixel-level operations for high-speed adjustments on multi-core systems.

### 🖼️ Elite RAW Support
- **Native RAW Decoding**: Direct support for professional formats:
    - Sony (**ARW**)
    - Canon (**CR2**)
    - Nikon (**NEF**)
    - Adobe Digital Negative (**DNG**)
- **Basic Demosaicing**: Half-size color reconstruction for fast, high-quality RAW previews.

### 🛠️ Advanced Toolset
- **Intelligent Filters**:
    - **Adaptive Thresholding**: Clean up documents or create high-contrast artistic effects.
    - **Median Denoise**: Advanced noise reduction that preserves edges.
    - **Fine Adjustments**: Professional-grade brightness, contrast, and saturation controls with real-time feedback.
- **Batch Watermarking**: Integrated into the web export pipeline (Native support coming soon).

## 🏗️ Architecture

ClioBulk Pro uses a hybrid architecture for maximum flexibility:
- **Frontend**: React + Vite + Tailwind CSS for a fluid, responsive UI.
- **Core (Native)**: Rust-based commands for heavy lifting (RAW decoding, bulk saving).
- **Core (Web)**: Fallback WASM/WebGL engine for instant previews and cross-platform compatibility.

## 🚀 Getting Started

### Development
1. Clone the repository.
2. Install dependencies: `npm install`
3. Run in development mode: `npm run tauri dev`

### Production Build
`npm run tauri build`

## 📘 Documentation
For a deep dive into the architecture and troubleshooting, see [DOCS.md](./DOCS.md).

---
**ClioBulk Professional Edition** - *Your photos, your hardware, your privacy.* 🛡️✨
