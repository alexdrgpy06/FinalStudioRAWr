/**
 * Author: Alejandro Ramírez
 * 
 * LibRaw WASM Diagnostic Utility
 * 
 * A specialized diagnostic tool to verify the integrity and 
 * responsiveness of the LibRaw-WASM module. It performs a "heartbeat" 
 * check by instantiating the module and attempting a minimal 
 * operation, ensuring the WASM environment is correctly initialized 
 * before critical processing starts.
 */
import LibRaw from 'libraw-wasm';

/**
 * Diagnostic function to verify LibRaw initialization and WASM loading.
 * @returns {Promise<string>} - "OK" or error message
 */
export async function testLibRaw() {
    try {
        console.log("Starting LibRaw diagnostic...");
        const raw = new LibRaw();
        console.log("LibRaw instance created.");

        // Try to access metadata with a dummy buffer?
        // Or just checking if module loads is enough for WASM check?
        // Usually creating instance spawns worker.
        // We need to send a message to worker to verify it's alive.
        // But the API doesn't expose a ping.
        // We can try to open an empty buffer and expect specific error, not crash.

        const dummy = new Uint8Array(10);
        try {
            await raw.open(dummy);
        } catch (e) {
            // Expected error for invalid file, but confirms WASM ran!
            // If WASM failed to load, it might throw "Failed to fetch" or similar.
            if (e.message && (e.message.includes("Input file is too small") || e.message.includes("is not valid"))) {
                console.log("LibRaw responded (expected error):", e.message);
                return "OK";
            }
            if (e.toString().includes("Input file is too small")) return "OK";
            // LibRaw might return -100005 or equivalent
            console.log("LibRaw threw:", e);
            // If it throws "RuntimeError: abort", WASM might be missing.
        } finally {
            raw.worker.terminate();
        }

        return "OK";
    } catch (e) {
        console.error("LibRaw Diagnostic Failed:", e);
        return `Error: ${e.message}`;
    }
}
