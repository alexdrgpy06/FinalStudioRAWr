# FinalStudioRAWr 📸

The ultimate professional RAW processing engine for the modern creator.

## 🚀 Overview
FinalStudioRAWr is a browser-based RAW processing suite for professional photographers and digital artists. It runs entirely in the browser using **LibRaw-WASM** for RAW decoding and a pure-JavaScript processing pipeline for non-destructive development, with persistent storage via **IndexedDB** (`idb`). There is no native desktop engine in the current codebase.

## ✨ Key Features
- **Browser-Based RAW Decoding**: LibRaw-WASM decodes major camera RAW formats directly in the browser with no server round-trip.
- **Non-Destructive Processing Pipeline**: Full-stage pipeline — exposure normalization with highlight rolloff, sigmoid tone-curve contrast, color grading (temp/tint/saturation), local contrast/clarity, vignette, grain, unsharp-mask sharpen, and trilinear 3D LUT application (HaldCLUT).
- **XMP Presets**: Apply and manage preset looks.
- **Persistent Storage**: Project data and settings are stored locally in the browser via IndexedDB (`idb`); no backend or cloud account required.
- **Pure Client-Side**: No backend server, no installers — open the app via `npm run dev` or deploy the static build.

## 🛠️ Tech Stack
- **Frontend**: React 18, Vite 5.
- **RAW Decoding**: LibRaw compiled to WebAssembly (`libraw-wasm`).
- **Storage**: IndexedDB via `idb`.
- **State Management**: Zustand with local persistence.
- **Styling**: Tailwind CSS.
- **Icons**: Lucide React.

## 📦 Build & Run
- `npm install` — install dependencies.
- `npm run dev` — start the Vite dev server for local development.
- `npm run build` — produce an optimized static bundle in `dist/`.
- `npm run preview` — locally preview the production build.

> **Note:** `package.json` retains a vestigial `"tauri": "tauri"` script entry, but there is **no `src-tauri/` directory and no `@tauri-apps/*` dependency** — a native Tauri desktop build is a *planned* future target and is **not yet implemented**. The current codebase ships only as a browser-based Vite app and produces no MSI/AppImage installer.

## ⚠️ Processing Architecture
Image decoding and processing currently run **synchronously on the main thread** (the Web Worker files present in the repo are currently orphaned and unused). Large batch jobs may block the UI. Offloading the pipeline to a Web Worker is a known future improvement.

---
**[STABLE VERSION - DO NOT MODIFY CORE LOGIC]**
*Created and maintained by Alejandro Ramírez.*
