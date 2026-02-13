## 2026-02-13 - [Arbitrary File Write in Bulk Processing]
**Vulnerability:** The `process_bulk` Tauri command blindly trusted the output path provided by the frontend, allowing potential arbitrary file writes or overwrites if the frontend was compromised or manipulated.
**Learning:** In desktop apps (Tauri/Electron), treat the frontend as untrusted. Never accept full file paths for write operations if you can avoid it. Instead, accept a directory and construct filenames on the backend, or validate strictly.
**Prevention:** Change API signatures to accept `output_dir` + `filenames` (or generate filenames backend-side) instead of full paths. Use `Path::join` and `Path::file_name` to sanitize inputs.
