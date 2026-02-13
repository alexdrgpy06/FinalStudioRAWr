/**
 * HaldCLUT LUT Processor
 * Applies a Hald Color Lookup Table (HaldCLUT) PNG to image data.
 * Port of Pipeline.step_lut_3d() from processor.py
 *
 * HaldCLUT format: A square PNG where the side length is level^3.
 * Common sizes: 64x64 (level=4, 4³=64), 512x512 (level=8, 8³=512)
 * Each pixel encodes a mapping from (R, G, B) → (R', G', B')
 */

/**
 * Parse a HaldCLUT image into a 3D lookup table array.
 * @param {ImageData} lutImageData - The HaldCLUT image as ImageData
 * @returns {{ table: Float32Array, size: number }} - 3D LUT table and grid size
 */
export function parseHaldCLUT(lutImageData) {
    const { data, width, height } = lutImageData;

    if (width !== height) {
        throw new Error(`Invalid HaldCLUT: must be square, got ${width}x${height}`);
    }

    // Determine the CLUT level: width = level^3
    // level=4 → 64x64, level=8 → 512x512
    const side = width;
    let level = Math.round(Math.pow(side, 1 / 3));

    // Verify
    if (level * level * level !== side) {
        // Try level^2 (some HaldCLUTs use level^2 as side)
        level = Math.round(Math.sqrt(side));
        if (level * level !== side) {
            throw new Error(`Invalid HaldCLUT dimensions: ${side}`);
        }
    }

    const gridSize = level * level; // number of discrete values per channel

    // Build the 3D table: table[r][g][b] = { R, G, B }
    // Stored as flat Float32Array: [R, G, B, R, G, B, ...]
    const tableSize = gridSize * gridSize * gridSize * 3;
    const table = new Float32Array(tableSize);

    for (let i = 0; i < side * side; i++) {
        const px = (i % side);
        const py = Math.floor(i / side);

        const srcIdx = (py * side + px) * 4;
        const r = data[srcIdx] / 255;
        const g = data[srcIdx + 1] / 255;
        const b = data[srcIdx + 2] / 255;

        table[i * 3] = r;
        table[i * 3 + 1] = g;
        table[i * 3 + 2] = b;
    }

    return { table, size: gridSize };
}

/**
 * Apply a parsed HaldCLUT to image data using trilinear interpolation.
 * @param {ImageData} imageData - Source image data (mutated in place)
 * @param {ImageData} lutImageData - HaldCLUT image data
 * @param {number} [intensity=1.0] - Blend factor (0 = original, 1 = fully graded)
 * @returns {ImageData}
 */
export function applyHaldCLUT(imageData, lutImageData, intensity = 1.0) {
    const { table, size } = parseHaldCLUT(lutImageData);
    const { data } = imageData;

    const maxIdx = size - 1;

    for (let i = 0; i < data.length; i += 4) {
        const origR = data[i];
        const origG = data[i + 1];
        const origB = data[i + 2];

        // Map pixel to LUT coordinates
        const rF = (origR / 255) * maxIdx;
        const gF = (origG / 255) * maxIdx;
        const bF = (origB / 255) * maxIdx;

        // Integer indices for trilinear interpolation
        const r0 = Math.floor(rF), r1 = Math.min(r0 + 1, maxIdx);
        const g0 = Math.floor(gF), g1 = Math.min(g0 + 1, maxIdx);
        const b0 = Math.floor(bF), b1 = Math.min(b0 + 1, maxIdx);

        // Fractional parts
        const rD = rF - r0;
        const gD = gF - g0;
        const bD = bF - b0;

        // Trilinear interpolation across 8 corners
        let outR = 0, outG = 0, outB = 0;

        for (let ri = 0; ri <= 1; ri++) {
            for (let gi = 0; gi <= 1; gi++) {
                for (let bi = 0; bi <= 1; bi++) {
                    const rr = ri === 0 ? r0 : r1;
                    const gg = gi === 0 ? g0 : g1;
                    const bb = bi === 0 ? b0 : b1;

                    const idx = (rr + gg * size + bb * size * size) * 3;
                    const weight = (ri === 0 ? 1 - rD : rD)
                        * (gi === 0 ? 1 - gD : gD)
                        * (bi === 0 ? 1 - bD : bD);

                    outR += table[idx] * weight;
                    outG += table[idx + 1] * weight;
                    outB += table[idx + 2] * weight;
                }
            }
        }

        // Blend with original based on intensity
        if (intensity < 1.0) {
            outR = (origR / 255) * (1 - intensity) + outR * intensity;
            outG = (origG / 255) * (1 - intensity) + outG * intensity;
            outB = (origB / 255) * (1 - intensity) + outB * intensity;
        }

        data[i] = Math.round(Math.max(0, Math.min(1, outR)) * 255);
        data[i + 1] = Math.round(Math.max(0, Math.min(1, outG)) * 255);
        data[i + 2] = Math.round(Math.max(0, Math.min(1, outB)) * 255);
    }

    return imageData;
}

/**
 * Load a HaldCLUT PNG from a file/blob and return its ImageData.
 * @param {File|Blob} file - The HaldCLUT PNG file
 * @returns {Promise<ImageData>}
 */
export async function loadLUTFile(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            URL.revokeObjectURL(url);
            resolve(imageData);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load LUT image'));
        };
        img.src = url;
    });
}
