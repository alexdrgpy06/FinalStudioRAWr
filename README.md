# FinalStudioRAWr 📸

**FinalStudioRAWr** is a high-performance, dual-engine image processor designed for professional photographers. It combines the power of a **Native GPU Engine (Rust/WGPU)** for maximum performance on desktop with a **Browser Web Engine (WASM/JS)** for seamless accessibility and cloud preview.

## 🚀 Key Features

- **Dual-Engine Architecture:** Automatically switches between Native (via Tauri) and Web (via LibRaw-WASM) for the best possible experience.
- **Fast RAW Decoding:** Custom half-size demosaicing in Rust and optimized WASM decoding for instant previews.
- **Professional Pipeline:** Exposure normalization, Tone curves, HSL, Color Grading, 3D LUT support, and Shadow/Highlight recovery.
- **Batch Processing:** High-speed parallel export using all CPU cores.
- **Vercel Ready:** Deploy the web version instantly to the cloud.

## 🛠️ Technology Stack

- **Frontend:** React 18+, Tailwind CSS, Zustand, Lucide Icons.
- **Native Core:** Rust, Tauri v2, Rayon (Parallelism), Image-rs.
- **Web Core:** Web Workers, LibRaw-WASM, Canvas API.

## 📦 Project Structure

- `src-tauri/`: Rust backend and Tauri configuration.
- `src/`: React frontend source.
  - `engine/`: Shared image processing logic (JS/WASM).
  - `storage/`: Local persistence (IndexedDB).
- `public/`: Static assets (Presets, LUTs).

## 🚀 Getting Started

### Native Desktop (Tauri)
1. Install Rust and Node.js.
2. Run `npm install`.
3. Run `npm run tauri dev`.

### Web Deployment (Vercel)
1. Push to GitHub.
2. Connect to Vercel.
3. Done! (The `vercel.json` and `vite.config.js` are already optimized for production).

## 📜 Documentation

Detailed technical documentation can be found in [DOCS.md](./DOCS.md).

---
© 2026 FinalStudio Team
