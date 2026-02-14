import { isTauri } from './platform.js';
import { processFile as webProcessFile } from './image-engine.js';

/**
 * Unified processing bridge.
 * Switches between Native (Tauri) and Web (WASM/JS) engines.
 */
export async function processImage(file, basePreset, creativePreset, overrides = {}, assets = {}, onProgress = null) {
  return webProcessFile(file, basePreset, creativePreset, overrides, assets, onProgress);
}

/**
 * Bulk processing bridge
 */
export async function processBulk(files, basePreset, creativePreset, overrides = {}, assets = {}, onProgress = null) {
    // Web implementation for Bulk
    console.log("[Bridge] Using Web Bulk Engine");
    const results = [];
    for (let i = 0; i < files.length; i++) {
        const fileObj = files[i];
        if (onProgress) onProgress(((i + 1) / files.length) * 100, `Processing ${fileObj.name || i}...`);
        
        try {
            const canvas = await webProcessFile(fileObj, basePreset, creativePreset, overrides, assets);
            results.push(canvas);
        } catch (e) {
            console.error(`[Bridge] Web process failed for file ${i}:`, e);
        }
    }
    return { success: true, engine: 'web', results };
}
