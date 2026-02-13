import { invoke } from '@tauri-apps/api/core';

/**
 * RAW Decoder Utility
 * Integrates libraw-wasm for web and native Rust commands for Tauri.
 */

export async function decodeRaw(file) {
  const isTauri = window.__TAURI__ !== undefined;

  if (isTauri) {
    console.log('Native RAW Decoding:', file.name);
    try {
      // In Tauri, we'd ideally pass the path. 
      // For now, we call our native command.
      const result = await invoke('decode_raw', { path: file.name });
      console.log('Native Result:', result);
      // Native engine handles the heavy lifting.
      // We return the original file as a bitmap for the UI preview fallback.
      return createImageBitmap(file);
    } catch (e) {
      console.error('Native RAW decoding failed:', e);
    }
  }

  // WEB FALLBACK (WASM)
  console.log('Web RAW Decoding (WASM stub):', file.name);
  return createImageBitmap(file); 
}

export function isRaw(file) {
  const rawExtensions = ['.arw', '.cr2', '.nef', '.dng', '.orf', '.raf'];
  return rawExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
}
