/**
 * RAW File Decoder
 * Uses libraw-wasm for in-browser RAW decoding.
 *
 * imageData() returns: { width, height, colors, bits, dataSize, data: Uint8Array(RGB) }
 * IMPORTANT: Use width/height from imageData(), NOT from metadata(),
 * because halfSize mode changes the output resolution.
 */

import LibRaw from 'libraw-wasm';
import { loadImageFromFile } from './image-engine.js';

const RAW_EXTENSIONS = new Set([
    '.arw', '.cr2', '.cr3', '.nef', '.dng', '.raf', '.orf',
    '.rw2', '.pef', '.srw', '.x3f', '.3fr', '.mrw'
]);

export function isRawFile(filename) {
    const ext = '.' + filename.split('.').pop().toLowerCase();
    return RAW_EXTENSIONS.has(ext);
}

export async function decodeRawFile(file, options = {}) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    // Standard images bypass LibRaw
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
        await raw.open(uint8, {
            halfSize: !!options.fast,
            useCameraWb: true,
            useAutoWb: false,
            bright: 1.0,
            outputColor: 1,
            outputBps: 8,
        });

        const meta = await raw.metadata();
        const result = await raw.imageData();

        // Use dimensions from the imageData result, not metadata
        const width = result.width;
        const height = result.height;
        const data = result.data;

        console.log(`[Decoder] ${file.name}: ${width}x${height}, ${data.length} bytes, ${result.colors}ch ${result.bits}bit`);

        if (!data || data.length === 0) {
            throw new Error("LibRaw returned empty image data");
        }

        const totalPixels = width * height;
        const rgbaData = new Uint8ClampedArray(totalPixels * 4);

        if (result.colors === 4 || data.length === totalPixels * 4) {
            // RGBA
            rgbaData.set(data);
        } else {
            // RGB → RGBA
            for (let i = 0; i < totalPixels; i++) {
                const i3 = i * 3;
                const i4 = i * 4;
                rgbaData[i4] = data[i3];
                rgbaData[i4 + 1] = data[i3 + 1];
                rgbaData[i4 + 2] = data[i3 + 2];
                rgbaData[i4 + 3] = 255;
            }
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

export async function decodeRawToCanvas(file) {
    const { imageData, width, height } = await decodeRawFile(file);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').putImageData(imageData, 0, 0);
    return canvas;
}
