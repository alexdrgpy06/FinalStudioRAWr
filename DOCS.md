# ClioBulk Architectural Overview & Troubleshooting

## Introduction
ClioBulk is a professional-grade bulk image processing application built with Tauri and React. It is designed for photographers who need to apply standard adjustments (brightness, contrast, denoise) to large sets of images, including RAW formats.

## Architecture

### Frontend (React + Vite)
- **Framework**: React with Tailwind CSS for styling.
- **Build Tool**: Vite, configured to run on port 5199.
- **State Management**: React Hooks for local UI state.
- **Communication**: Uses `@tauri-apps/api` to invoke Rust commands and listen for progress events.

### Backend (Tauri + Rust)
- **Core**: Rust-based Tauri backend for high-performance image processing.
- **Image Processing**:
    - `image`: General image manipulation.
    - `imageproc`: Advanced filters like median filter (denoise) and adaptive thresholding.
    - `rawloader`: Decoding RAW files (ARW, CR2, NEF, DNG).
    - **Optimization**: Uses `rayon` for parallel pixel-level operations (e.g., saturation adjustment) and `tokio` for concurrent file processing.
    - **RAW Support**: Improved with a basic half-size demosaicing algorithm to provide color previews instead of grayscale.
- **Concurrency**: Uses `tokio` with a `Semaphore` to limit concurrent image processing tasks, preventing system resource exhaustion. Concurrency is automatically tuned to 75% of available logical cores.
- **Events**: Emits `process-progress` events to the frontend to provide real-time updates.

## Development Setup (Port 5199)

The application is configured to use port **5199** for the Vite development server.

### Configuration
- **package.json**: `"dev": "vite --port 5199 --strictPort"`
- **tauri.conf.json**: `"devUrl": "http://localhost:5199"`

### Why Port 5199?
A specific port is used to ensure consistency between the frontend dev server and the Tauri backend's expectation. `strictPort` is enabled to prevent Vite from automatically switching to another port if 5199 is busy, which would break the Tauri connection.

### Troubleshooting Port 5199
If you encounter a "Failed to connect" error when starting development:
1. **Check for Port Conflicts**: Run `netstat -ano | findstr :5199` to see if another process is using the port.
2. **Firewall**: Ensure your local firewall allows connections to localhost:5199.
3. **ZOMBIE Processes**: Sometimes a previous Vite instance might still be running. Kill it via Task Manager or `taskkill /F /IM node.exe`.

## General Troubleshooting

### RAW File Support
ClioBulk supports ARW, CR2, NEF, and DNG via the `rawloader` crate. If a RAW file fails to decode:
- Ensure the format is supported by `rawloader`.
- Check if the file is corrupted.
- Check logs for specific decoding errors.

### Performance Issues
Bulk processing is CPU-intensive. ClioBulk automatically calculates concurrency based on your CPU cores (usually half of available logical cores).
- If the system becomes unresponsive, the concurrency limit might need adjustment in `src-tauri/src/commands.rs`.

### Logging
Logs are handled by `tauri-plugin-log`. 
- **Development**: Logs are printed to the terminal/console.
- **Production**: Logs can be found in the application data directory (e.g., `%APPDATA%/ClioBulk/logs/cliobulk.log` on Windows).
