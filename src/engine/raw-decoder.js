/**
 * RAW File Decoder
 * Uses libraw-wasm for in-browser RAW decoding.
 * 
 * Refactored to use the high-level API provided by libraw-wasm 1.1.2+.
 * The package handles Worker spawning and WASM loading internally.
 */

import LibRaw from 'libraw-wasm';
import { loadImageFromFile } from './image-engine.js';

const RAW_EXTENSIONS = new Set([
    '.arw', '.cr2', '.cr3', '.nef', '.dng', '.raf', '.orf',
    '.rw2', '.pef', '.srw', '.x3f', '.3fr', '.mrw', '.jpg', '.jpeg', '.png'
]);

/**
 * Check if a filename is a RAW image format
 * @param {string} filename
 * @returns {boolean}
 */
export function isRawFile(filename) {
    const ext = '.' + filename.split('.').pop().toLowerCase();
    return RAW_EXTENSIONS.has(ext);
}

/**
 * Decode a RAW file to ImageData using libraw-wasm
 * @param {File} file - The RAW image file
 * @param {object} [options] - Options for decoding
 * @param {boolean} [options.fast=false] - If true, try to decode faster (half size)
 * @returns {Promise<{imageData: ImageData, width: number, height: number, metadata: object}>}
 */
export async function decodeRawFile(file, options = {}) {
    const { fast = false } = options;
    const buffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(buffer);

    // Fallback for standard images if they are passed here
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        const img = await loadImageFromFile(file);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return {
            imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
            width: img.width,
            height: img.height,
            metadata: {}
        };
    }

    // Instantiate LibRaw (spawns a worker internally)
    const raw = new LibRaw();

    try {
        // Open the RAW file with settings
        // halfSize: true significantly speeds up decoding (1/2 or 1/4 resolution)
        await raw.open(uint8, {
            halfSize: !!fast,
            useCameraWb: true,
            useAutoWb: false,
            bright: 1.2,
            outputColor: 1, 
            outputBps: 16,
            noAutoBright: false
        });

        const meta = await raw.metadata();
        let data = await raw.imageData();
        if (!data || data.length === 0) {
            console.log("[RAW] Data empty, triggering manual process...");
            await raw.runFn("unpack");
            await raw.runFn("dcraw_process");
            data = await raw.imageData();
        }

        if (!data || !meta) {
            throw new Error("Failed to decode data from LibRaw");
        }

        const width = meta.width;
        const height = meta.height;
        const is16Bit = meta.bps === 16;

        const totalPixels = width * height;
        const rgbaData = new Uint8ClampedArray(totalPixels * 4);

        let rgbIdx = 0;
        let rgbaIdx = 0;

        if (is16Bit) {
            // Convert 16-bit RGB to 8-bit RGBA
            const data16 = new Uint16Array(data.buffer, data.byteOffset, data.length / 2);
            for (let i = 0; i < totalPixels; i++) {
                rgbaData[rgbaIdx] = data16[rgbIdx] >> 8;
                rgbaData[rgbaIdx + 1] = data16[rgbIdx + 1] >> 8;
                rgbaData[rgbaIdx + 2] = data16[rgbIdx + 2] >> 8;
                rgbaData[rgbaIdx + 3] = 255;
                rgbIdx += 3;
                rgbaIdx += 4;
            }
        } else {
            // Standard 8-bit conversion
            for (let i = 0; i < totalPixels; i++) {
                rgbaData[rgbaIdx] = data[rgbIdx];
                rgbaData[rgbaIdx + 1] = data[rgbIdx + 1];
                rgbaData[rgbaIdx + 2] = data[rgbIdx + 2];
                rgbaData[rgbaIdx + 3] = 255;
                rgbIdx += 3;
                rgbaIdx += 4;
            }
        }

        // Debug: Log sample pixels to check for black image issue
        const sampleIdx = Math.floor(totalPixels / 2) * 4;
        console.log(`[RAW Debug] Decoded ${width}x${height}. Center pixel (RGBA):`,
            rgbaData[sampleIdx], rgbaData[sampleIdx + 1], rgbaData[sampleIdx + 2], rgbaData[sampleIdx + 3]);
        console.log(`[RAW Debug] First pixel (RGBA):`,
            rgbaData[0], rgbaData[1], rgbaData[2], rgbaData[3]);

        // Create metadata object to match previous structure
        const metadata = {
            make: meta.make || '',
            model: meta.model || '',
            iso: meta.iso || 0,
            shutter: meta.shutter || 0,
            aperture: meta.aperture || 0,
            timestamp: meta.timestamp || 0
        };

        // There is no explicit free() method on the high-level wrapper wrapper in 1.1.2.
        // The worker remains active. If we want to terminate it:
        if (raw.worker && typeof raw.worker.terminate === 'function') {
            raw.worker.terminate();
        }

        return {
            imageData: new ImageData(rgbaData, width, height),
            width,
            height,
            metadata
        };

    } catch (err) {
        console.error(`Failed to decode RAW file "${file.name}":`, err);
        // Ensure worker is terminated on error
        if (raw.worker && typeof raw.worker.terminate === 'function') {
            raw.worker.terminate();
        }
        throw err;
    }
}

/**
 * Decode a RAW file directly to ImageData (no canvas involved, safe for Worker)
 * @param {File} file - The RAW image file
 * @param {object} [options]
 * @returns {Promise<ImageData>}
 */
export async function decodeRawToImageData(file, options) {
    const { imageData } = await decodeRawFile(file, options);
    return imageData;
}

/**
 * Extract the embedded JPEG preview from a RAW file.
 * NOTE: The libraw-wasm wrapper does not currently expose thumbnail extraction.
 * We return null to trigger the fallback to 'fast decode'.
 * 
 * @param {File} file 
 * @returns {Promise<{imageData: ImageData, width: number, height: number} | null>}
 */
export async function extractRawPreview(file) {
    // Current binding doesn't support unpack_thumb nicely.
    // Returning null causes the main worker (worker.js) to fall back 
    // to decodeRawToImageData({ fast: true }), which uses half-size decode.
    return null;
}

/**
 * Decode a RAW file and return it as a canvas element
 * @param {File} file - The RAW image file
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function decodeRawToCanvas(file) {
    const { imageData, width, height } = await decodeRawFile(file);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

/**
 * Decode a RAW file and return it as an ImageBitmap (for offscreen use)
 * @param {File} file
 * @returns {Promise<ImageBitmap>}
 */
export async function decodeRawToBitmap(file) {
    const canvas = await decodeRawToCanvas(file);
    return createImageBitmap(canvas);
}
