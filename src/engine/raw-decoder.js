/**
 * RAW File Decoder
 * Uses libraw-wasm for in-browser RAW decoding.
 */

import LibRaw from 'libraw-wasm';
import { loadImageFromFile } from './image-engine.js';

const RAW_EXTENSIONS = new Set([
    '.arw', '.cr2', '.cr3', '.nef', '.dng', '.raf', '.orf',
    '.rw2', '.pef', '.srw', '.x3f', '.3fr', '.mrw', '.jpg', '.jpeg', '.png'
]);

export function isRawFile(filename) {
    const ext = '.' + filename.split('.').pop().toLowerCase();
    return RAW_EXTENSIONS.has(ext);
}

export async function decodeRawFile(file, options = {}) {
    const { fast = false } = options;
    
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

    const buffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    const raw = new LibRaw();

    try {
        // Higher quality settings for decoding
        await raw.open(uint8, {
            halfSize: !!fast,
            useCameraWb: true,
            useAutoWb: false,
            bright: 1.0,
            outputColor: 1, // sRGB
            outputBps: 16, // Use 16-bit internal processing if possible
            noAutoScale: false,
            userQual: 3, // AHD demosaicing (better quality than default)
        });

        await raw.unpack();
        await raw.dcraw_process();

        const meta = await raw.metadata();
        const data = await raw.imageData(); // Uint8Array (RGB)

        if (!data || data.length === 0) {
            throw new Error("LibRaw returned empty image data");
        }

        const width = meta.width;
        const height = meta.height;
        const rgbaData = new Uint8ClampedArray(width * height * 4);

        // Optimized conversion loop
        for (let i = 0; i < width * height; i++) {
            const i3 = i * 3;
            const i4 = i * 4;
            rgbaData[i4]     = data[i3];
            rgbaData[i4 + 1] = data[i3 + 1];
            rgbaData[i4 + 2] = data[i3 + 2];
            rgbaData[i4 + 3] = 255;
        }

        if (raw.worker) raw.worker.terminate();

        return {
            imageData: new ImageData(rgbaData, width, height),
            width,
            height,
            metadata: meta
        };

    } catch (err) {
        console.error(`[Decoder] Failed:`, err);
        if (raw.worker) raw.worker.terminate();
        throw err;
    }
}

export async function decodeRawToImageData(file, options) {
    const { imageData } = await decodeRawFile(file, options);
    return imageData;
}

export async function extractRawPreview(file) {
    return null;
}

export async function decodeRawToCanvas(file) {
    const { imageData, width, height } = await decodeRawFile(file);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

export async function decodeRawToBitmap(file) {
    const canvas = await decodeRawToCanvas(file);
    return createImageBitmap(canvas);
}
