/* eslint-disable no-restricted-globals */
import { runCompoundPipeline, stepUserAdjustments } from './engine/image-engine.js';
import { decodeRawToImageData, extractRawPreview } from './engine/raw-decoder.js';
import { applyHaldCLUT } from './engine/lut-processor.js';

// Cache for decoded raw images to avoid re-decoding
let rawCache = {
    name: null,
    fastSource: null, // Embedded preview (fast, lower res/quality)
    fullSource: null, // Full RAW decode (slow, high res)
};

self.onmessage = async (e) => {
    const {
        type,
        file,
        imageData, // For non-RAW or already decoded images
        preset,
        basePreset,
        creativePreset,
        overrides,
        assets,
        previewMode = false, // If true, prioritize speed
        targetWidth = 1920
    } = e.data;

    try {
        if (type === 'process') {
            let srcImageData;

            // Handle File input (RAW or standard image)
            if (file) {
                // Check cache name match
                if (file.name !== rawCache.name) {
                    // New file, clear cache
                    rawCache = { name: file.name, fastSource: null, fullSource: null };
                }

                if (isRaw(file.name)) {
                    // Stratgy:
                    // previewMode=true -> Try 'fastSource' (embedded JPEG). Fallback to full.
                    // previewMode=false -> Must use 'fullSource' (actual RAW decode).

                    if (previewMode) {
                        if (!rawCache.fastSource) {
                            // Try to extract embedded preview
                            // This is much faster and matches "Original" view in App
                            const preview = await extractRawPreview(file);
                            if (preview) {
                                rawCache.fastSource = preview.imageData;
                            } else {
                                // Fallback: full decode if no preview found
                                if (!rawCache.fullSource) {
                                    rawCache.fullSource = await decodeRawToImageData(file, { fast: true });
                                }
                                // Downsample full source for fastSource to keep editing fast
                                rawCache.fastSource = downsampleImageData(rawCache.fullSource, 2000);
                            }
                        }
                        srcImageData = rawCache.fastSource;
                    } else {
                        // Export mode: Need full resolution
                        if (!rawCache.fullSource) {
                            rawCache.fullSource = await decodeRawToImageData(file);
                        }
                        srcImageData = rawCache.fullSource;
                    }
                } else {
                    // Standard image (JPG/PNG)
                    throw new Error("Standard images should be decoded in main thread and sent as ImageData");
                }
            } else if (imageData) {
                srcImageData = imageData;
            }

            if (!srcImageData) throw new Error("No source image data provided");

            // Clone data to avoid mutating cache
            const w = srcImageData.width;
            const h = srcImageData.height;
            const buffer = new Uint8ClampedArray(srcImageData.data);
            const workingData = new ImageData(buffer, w, h);

            // Run pipeline
            let result;
            if (basePreset && creativePreset) {
                result = runCompoundPipeline(workingData, basePreset, creativePreset, overrides, assets);
            } else {
                throw new Error("Use compound pipeline format");
            }

            // Return processed image
            self.postMessage({
                success: true,
                imageData: result,
                isPreview: previewMode
            }, [result.data.buffer]); // Transfer buffer
        }
    } catch (err) {
        console.error("Worker Error:", err);
        self.postMessage({ success: false, error: err.message });
    }
};

function isRaw(name) {
    return /\.(cr2|cr3|arw|nef|dng|raf|orf|rw2)$/i.test(name);
}

function downsampleImageData(imgData, targetWidth) {
    if (imgData.width <= targetWidth) return imgData;

    const scale = targetWidth / imgData.width;
    const targetHeight = Math.round(imgData.height * scale);

    const w = imgData.width;
    // const h = imgData.height; // unused
    const newData = new Uint8ClampedArray(targetWidth * targetHeight * 4);

    for (let y = 0; y < targetHeight; y++) {
        for (let x = 0; x < targetWidth; x++) {
            const sx = Math.floor(x / scale);
            const sy = Math.floor(y / scale);
            const srcIdx = (sy * w + sx) * 4;
            const dstIdx = (y * targetWidth + x) * 4;

            newData[dstIdx] = imgData.data[srcIdx];
            newData[dstIdx + 1] = imgData.data[srcIdx + 1];
            newData[dstIdx + 2] = imgData.data[srcIdx + 2];
            newData[dstIdx + 3] = imgData.data[srcIdx + 3];
        }
    }

    return new ImageData(newData, targetWidth, targetHeight);
}
