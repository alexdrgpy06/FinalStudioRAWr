# FinalStudio Cloud ☁️

**FinalStudio Cloud** is a lightweight, high-performance web-only image processor derived from FinalStudioRAWr. It is optimized for **Vercel deployment** and focuses exclusively on the **Browser Web Engine (WASM/JS)** for fast, accessible image processing without the need for a desktop installation.

## 🚀 Key Features

- **WASM-Powered Core:** High-performance RAW decoding and image processing using LibRaw-WASM and optimized JavaScript.
- **Vercel Optimized:** Extremely lightweight architecture designed for fast loading and low-latency processing in the cloud.
- **Professional Pipeline:** Full support for Exposure, Tone Curves, HSL, Color Grading, and 3D LUTs entirely in the browser.
- **Privacy First:** All processing happens locally in your browser's Web Workers. No images are uploaded to any server.
- **Batch Processing:** Parallel processing using Browser Web Workers.

## 🛠️ Technology Stack

- **Frontend:** React 18+, Tailwind CSS, Zustand, Lucide Icons.
- **Engine:** Web Workers, LibRaw-WASM, Canvas API.
- **Deployment:** Vercel / Vite.

## 📦 Changes from RAWr Version

- Removed Tauri/Native GPU engine for minimal bundle size.
- Streamlined UI to focus on cloud/web workflows.
- Simplified processing bridge (Cloud-only).
- Removed desktop-specific dependencies and local file system hooks.

## 🚀 Deployment

1. Push this branch (`cloud-only`) to GitHub.
2. Deploy the directory to Vercel.
3. The `vercel.json` provides necessary COOP/COEP headers for WASM memory isolation.

---
© 2026 FinalStudio Team
