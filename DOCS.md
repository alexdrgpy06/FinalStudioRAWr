# FinalStudioRAWr Architectural Overview & Troubleshooting

## Introduction
FinalStudioRAWr is a professional-grade image processing application built with a **Dual-Engine Architecture**. It leverages a high-performance Rust core via Tauri for native desktop usage and an optimized WASM-based engine for web and cloud environments.

## Architecture

### Frontend (React + Vite)
- **Framework**: React 18+ with Tailwind CSS.
- **State Management**: **Zustand** for global store and UI state.
- **Dual-Engine Bridge**: Intelligent logic detects the environment (Native vs Web) and routes processing tasks to the optimal engine.

### Engines

#### 1. Native GPU Engine (Rust)
- **Framework**: Tauri v2.
- **Performance**: 
    - `rayon` for multi-core pixel manipulation.
    - `tokio` for concurrent bulk processing.
    - `rawloader` with custom half-size demosaicing for ultra-fast RAW previews.
- **Commands**: `decode_raw`, `process_image`, `process_bulk`.

#### 2. Browser Web Engine (WASM/JS)
- **Framework**: LibRaw-WASM + Web Workers.
- **Implementation**: 
    - `image-engine.js`: Pure JS implementation of the processing pipeline (Exposure, Tone Curve, HSL).
    - `raw-decoder.js`: WASM-based RAW decoding in the browser.
    - **Worker Isolation**: Processing runs in background threads to keep the UI responsive.

## Deployment & Build

### Desktop (Tauri)
- Built using the root `package.json` and `src-tauri`.
- Port: **1420** (Default Tauri v2 port).
- `npm run tauri build` generates native installers (MSI, AppImage, etc.).

### Web (Vercel)
- Built using the same source code.
- Optimized via `vite.config.js` and `vercel.json` for WASM support.
- Static assets like presets and LUTs are served from `/public`.

## Troubleshooting

### SharedArrayBuffer Issues (Web)
If the web version fails to start the RAW engine, ensure your server (Vercel/Nginx) is sending the following headers:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`
(These are already configured in `vercel.json`).

### RAW File Support
- **Native**: Supports ARW, CR2, NEF, DNG.
- **Web**: Supports all formats compatible with LibRaw.

---
© 2026 FinalStudio Team
