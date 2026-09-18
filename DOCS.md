# FinalStudioRAWr Architectural Overview & Troubleshooting

## Introduction
FinalStudioRAWr is a professional-grade, browser-based image processing application. It decodes RAW camera files with **LibRaw-WASM** and runs a full non-destructive processing pipeline in pure JavaScript, persisting data locally in the browser via **IndexedDB** (`idb`). There is no native desktop engine in the current codebase.

## Architecture

### Frontend (React + Vite)
- **Framework**: React 18+ with Tailwind CSS.
- **State Management**: **Zustand** for global store and UI state (with local persistence).
- **Storage**: **IndexedDB** via `idb` — stores project data, settings, and image records entirely in the browser.

### Browser Engine (WASM/JS)
- **RAW Decoding**: `libraw-wasm` decodes major camera RAW formats (ARW, CR2, NEF, DNG, and all formats supported by LibRaw) directly in the browser with no server round-trip.
- **Processing Pipeline**: Pure-JS pipeline in `engine/image-engine.js` — exposure normalization with highlight rolloff, sigmoid tone-curve contrast, color grading (linear temp/tint/saturation shift), box-blur clarity/unsharp local contrast, vignette, Box-Muller gaussian grain, unsharp-mask sharpen, and trilinear-interpolated HaldCLUT 3D LUT application.
- **Important — synchronous processing:** Image decoding and processing currently run **synchronously on the main thread**. The Web Worker files present under `src/workers/` are orphaned and not used by the app. Large batch jobs may block the UI; moving the pipeline to a worker is a known future improvement. (This repo's earlier claim of "background thread" processing was inaccurate and has been corrected.)

## Deployment & Build

### Web (Static Host)
- `npm run build` produces an optimized static bundle in `dist/` (standard Vite output) suitable for any static host (Vercel, Netlify, S3, etc.).
- `npm run preview` previews the production build locally.
- Static assets (presets, LUTs) are served from `/public`.

> **Note on native builds:** `package.json` retains a vestigial `"tauri"` script entry and `.gitignore` references `src-tauri/target`, indicating a native Tauri desktop build is a *planned* future target. It is **not yet implemented** — there is no `src-tauri/` directory and no `@tauri-apps/*` dependency. No MSI, AppImage, or other native installer is produced by this codebase.

## Troubleshooting

### RAW File Support
- **Browser**: Supports all formats compatible with LibRaw (ARW, CR2, NEF, DNG, etc.) via LibRaw-WASM.

### Dev Server
- `npm run dev` starts the Vite dev server (default port 5173).
- Vite 5 / esbuild dev-server advisories are tracked in `HARDENING_CHECKLIST.md` (dev-tooling only, not shipped in the production bundle).

---
© 2026 FinalStudio Team
