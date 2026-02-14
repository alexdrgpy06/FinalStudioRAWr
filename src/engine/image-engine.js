/**
 * AutoStudio Image Processing Engine
 * Port of edge-agent/processor.py Pipeline class to JavaScript
 * All processing runs locally in the browser using Canvas 2D / typed arrays.
 */

import { applyHaldCLUT } from './lut-processor.js';

// ─────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────

/** sRGB → linear (High precision) */
function toLinear(v) { 
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
/** linear → sRGB (High precision) */
function toSRGB(v) { 
    return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

function clamp(v, lo = 0, hi = 1) { return v < lo ? lo : v > hi ? hi : v; }

function smoothmask(v, lo, hi) {
    const eps = 1e-6;
    return clamp((v - lo) / (hi - lo + eps), 0, 1);
}

/** Compute luminance from linear RGB */
function luminance(r, g, b) {
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert ImageData to Float32 arrays [0..1]
 * Returns { r, g, b, width, height }
 */
function imageDataToFloat(imageData) {
    const { data, width, height } = imageData;
    const len = width * height;
    const r = new Float32Array(len);
    const g = new Float32Array(len);
    const b = new Float32Array(len);
    for (let i = 0; i < len; i++) {
        const idx = i * 4;
        r[i] = data[idx] / 255;
        g[i] = data[idx + 1] / 255;
        b[i] = data[idx + 2] / 255;
    }
    return { r, g, b, width, height };
}

/** Write Float32 channels back to ImageData */
function floatToImageData(channels, imageData) {
    const { r, g, b } = channels;
    const { data } = imageData;
    const len = r.length;
    for (let i = 0; i < len; i++) {
        const idx = i * 4;
        data[idx] = Math.round(clamp(r[i], 0, 1) * 255);
        data[idx + 1] = Math.round(clamp(g[i], 0, 1) * 255);
        data[idx + 2] = Math.round(clamp(b[i], 0, 1) * 255);
        // alpha stays 255
    }
}

/** Percentile computation on a Float32Array (using sampling for speed) */
function percentile(arr, p, step = 8) {
    const sampled = [];
    for (let i = 0; i < arr.length; i += step) {
        sampled.push(arr[i]);
    }
    sampled.sort((a, b) => a - b);
    const idx = Math.floor((p / 100) * (sampled.length - 1));
    return sampled[idx];
}

// ─────────────────────────────────────────────────────────
// Pipeline Steps (ported from processor.py)
// ─────────────────────────────────────────────────────────

/**
 * Exposure Intelligence v3 — Lift / Neutral / Recover
 * Direct port of Pipeline.step_exposure()
 */
export function stepExposure(imageData, params = {}) {
    const {
        target_mid = 0.45,
        target_high = 0.92,
        hard_clip = 0.96,
        mid_low = 0.38,
        mid_high = 0.52,
        strength = 1.0,
        max_gain = 2.0,
        min_gain = 0.50,
        preserve_highlights = true,
        rolloff_threshold = 0.80,
        recovery_aggressiveness = 1.00,
        headroom_bias = 0.35,
    } = params;

    if (strength <= 0) return imageData;
    const eps = 1e-6;

    const ch = imageDataToFloat(imageData);
    const len = ch.r.length;

    // To linear
    const linR = new Float32Array(len);
    const linG = new Float32Array(len);
    const linB = new Float32Array(len);
    const lum = new Float32Array(len);

    for (let i = 0; i < len; i++) {
        linR[i] = toLinear(ch.r[i]);
        linG[i] = toLinear(ch.g[i]);
        linB[i] = toLinear(ch.b[i]);
        lum[i] = luminance(linR[i], linG[i], linB[i]);
    }

    // Percentiles
    const p50 = percentile(lum, 50);
    const p95 = percentile(lum, 95);
    const p99 = percentile(lum, 99);
    const p999 = percentile(lum, 99.9);

    // Targets in linear
    const tMidLin = toLinear(target_mid);
    const tHighLin = toLinear(target_high);
    const tClipLin = toLinear(hard_clip);
    const mLowLin = toLinear(mid_low);
    const mHighLin = toLinear(mid_high);

    const headroom = tHighLin / (p95 + eps);
    const headroomExtreme = tClipLin / (p999 + eps);

    // Dynamic max gain
    let dynMax;
    if (p50 < toLinear(0.08)) dynMax = 4.0;
    else if (p50 < toLinear(0.14)) dynMax = 3.0;
    else if (p50 < toLinear(0.20)) dynMax = 2.5;
    else dynMax = max_gain;

    const maxAllowed = Math.max(max_gain, dynMax);

    let mode = 'NEUTRAL';
    let gain = 1.0;
    const gainMid = tMidLin / (p50 + eps);
    let desired = 1.0;

    const overP95 = p95 > tHighLin;
    const overP99 = p99 > tClipLin * 1.05;

    if (overP95 || (overP99 && p95 > tHighLin * 0.85)) {
        mode = 'RECOVER';
        const gainP95 = tHighLin / (p95 + eps);
        let gainP99 = 1.0;
        if (overP99) {
            const overflow = (p99 - tClipLin) / Math.max(1.0 - tClipLin, eps);
            gainP99 = 1.0 - Math.min(0.25, overflow * 0.20);
        }
        gain = Math.min(gainP95, gainP99);
        gain = Math.pow(gain, recovery_aggressiveness);
    } else {
        if (mLowLin <= p50 && p50 <= mHighLin && p95 <= tHighLin) {
            mode = 'NEUTRAL';
            gain = 1.0;
        } else {
            if (headroom < 1.55 && p95 > toLinear(0.55)) {
                mode = 'NEUTRAL';
                gain = 1.0;
                desired = 1.0;
            } else {
                desired = (1.0 - headroom_bias) * gainMid + headroom_bias * Math.min(headroom, gainMid);
                gain = Math.max(1.0, desired);
                gain = Math.min(gain, Math.max(1.0, headroom));
                mode = gain > 1.01 ? 'LIFT' : 'NEUTRAL';
            }
        }
    }

    gain = clamp(gain, min_gain, maxAllowed);

    // Apply gain
    for (let i = 0; i < len; i++) {
        linR[i] *= gain;
        linG[i] *= gain;
        linB[i] *= gain;
    }

    // Highlight rolloff
    if (preserve_highlights && (gain > 1.0 || p99 > tClipLin)) {
        const threshLin = toLinear(rolloff_threshold);
        const sf = 1.0 - threshLin;
        for (let i = 0; i < len; i++) {
            if (linR[i] > threshLin) linR[i] = threshLin + sf * (1 - Math.exp(-(linR[i] - threshLin) / Math.max(sf, eps)));
            if (linG[i] > threshLin) linG[i] = threshLin + sf * (1 - Math.exp(-(linG[i] - threshLin) / Math.max(sf, eps)));
            if (linB[i] > threshLin) linB[i] = threshLin + sf * (1 - Math.exp(-(linB[i] - threshLin) / Math.max(sf, eps)));
        }
    }

    // Blend strength
    if (strength < 1.0) {
        const origCh = imageDataToFloat(imageData);
        for (let i = 0; i < len; i++) {
            const oR = toLinear(origCh.r[i]), oG = toLinear(origCh.g[i]), oB = toLinear(origCh.b[i]);
            linR[i] = oR * (1 - strength) + linR[i] * strength;
            linG[i] = oG * (1 - strength) + linG[i] * strength;
            linB[i] = oB * (1 - strength) + linB[i] * strength;
        }
    }

    // Back to sRGB
    for (let i = 0; i < len; i++) {
        ch.r[i] = toSRGB(clamp(linR[i], 0, 1));
        ch.g[i] = toSRGB(clamp(linG[i], 0, 1));
        ch.b[i] = toSRGB(clamp(linB[i], 0, 1));
    }

    floatToImageData(ch, imageData);
    return imageData;
}

/**
 * Tone Curve — S-Curve contrast
 * Direct port of Pipeline.step_tone_curve()
 */
export function stepToneCurve(imageData, params = {}) {
    const { contrast = 0.1, black_lift = 0.0, highlight_rolloff = 0.0 } = params;

    const lut = new Uint8Array(256);
    const k = 1.0 + contrast * 10;

    const yRaw = new Float64Array(256);
    for (let i = 0; i < 256; i++) {
        const x = i / 255;
        yRaw[i] = 1 / (1 + Math.exp(-k * (x - 0.5)));
    }

    const yMin = yRaw[0], yMax = yRaw[255];
    for (let i = 0; i < 256; i++) {
        let y = (yRaw[i] - yMin) / (yMax - yMin);
        if (black_lift > 0) y = y * (1 - black_lift) + black_lift;
        if (highlight_rolloff > 0) y = y * (1 - highlight_rolloff);
        lut[i] = Math.round(clamp(y, 0, 1) * 255);
    }

    const { data } = imageData;
    for (let i = 0; i < data.length; i += 4) {
        data[i] = lut[data[i]];
        data[i + 1] = lut[data[i + 1]];
        data[i + 2] = lut[data[i + 2]];
    }
    return imageData;
}

/**
 * Color Grade — Temperature, Tint, Saturation
 * Direct port of Pipeline.step_color_grade()
 */
export function stepColorGrade(imageData, params = {}) {
    const { temp_shift = 0, tint_shift = 0, sat = 1.0 } = params;

    const { data } = imageData;

    // Temp/tint shift
    if (temp_shift !== 0 || tint_shift !== 0) {
        for (let i = 0; i < data.length; i += 4) {
            data[i] = clamp((data[i] + temp_shift * 0.1) / 255, 0, 1) * 255;
            data[i + 1] = clamp((data[i + 1] + tint_shift * 0.1) / 255, 0, 1) * 255;
            data[i + 2] = clamp((data[i + 2] - temp_shift * 0.1) / 255, 0, 1) * 255;
        }
    }

    // Saturation
    if (sat !== 1.0) {
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            data[i] = clamp(gray + sat * (r - gray), 0, 255);
            data[i + 1] = clamp(gray + sat * (g - gray), 0, 255);
            data[i + 2] = clamp(gray + sat * (b - gray), 0, 255);
        }
    }

    return imageData;
}

/**
 * Local Contrast (Clarity) — Unsharp Mask with large radius
 * Port of Pipeline.step_local_contrast()
 */
export function stepLocalContrast(imageData, params = {}) {
    const { amount = 0.0, radius = 40 } = params;
    if (amount <= 0) return imageData;

    const { data, width, height } = imageData;

    // Simple box blur approximation for unsharp mask
    const blurred = boxBlur(data, width, height, Math.min(radius, 20));
    const percent = amount * 100;

    for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
            const diff = data[i + c] - blurred[i + c];
            data[i + c] = clamp(data[i + c] + diff * (percent / 100), 0, 255);
        }
    }

    return imageData;
}

/** Optimized box blur using sliding window with Float32 intermediate for precision */
function boxBlur(data, width, height, radius) {
    if (radius < 1) return data;
    const out = new Uint8ClampedArray(data.length);
    const temp = new Float32Array(data.length);
    const count = radius * 2 + 1;

    // Horizontal pass
    for (let y = 0; y < height; y++) {
        let rSum = 0, gSum = 0, bSum = 0;
        const rowOffset = y * width * 4;
        
        for (let dx = -radius; dx <= radius; dx++) {
            const nx = Math.min(Math.max(dx, 0), width - 1);
            const idx = rowOffset + nx * 4;
            rSum += data[idx]; gSum += data[idx + 1]; bSum += data[idx + 2];
        }
        
        for (let x = 0; x < width; x++) {
            const idx = rowOffset + x * 4;
            temp[idx] = rSum / count;
            temp[idx + 1] = gSum / count;
            temp[idx + 2] = bSum / count;
            temp[idx + 3] = 255;
            
            const prevX = Math.max(x - radius, 0);
            const nextX = Math.min(x + radius + 1, width - 1);
            rSum += data[rowOffset + nextX * 4] - data[rowOffset + prevX * 4];
            gSum += data[rowOffset + nextX * 4 + 1] - data[rowOffset + prevX * 4 + 1];
            bSum += data[rowOffset + nextX * 4 + 2] - data[rowOffset + prevX * 4 + 2];
        }
    }

    // Vertical pass
    for (let x = 0; x < width; x++) {
        let rSum = 0, gSum = 0, bSum = 0;
        
        for (let dy = -radius; dy <= radius; dy++) {
            const ny = Math.min(Math.max(dy, 0), height - 1);
            const idx = (ny * width + x) * 4;
            rSum += temp[idx]; gSum += temp[idx + 1]; bSum += temp[idx + 2];
        }
        
        for (let y = 0; y < height; y++) {
            const idx = (y * width + x) * 4;
            out[idx] = Math.round(rSum / count);
            out[idx + 1] = Math.round(gSum / count);
            out[idx + 2] = Math.round(bSum / count);
            out[idx + 3] = 255;
            
            const prevY = Math.max(y - radius, 0);
            const nextY = Math.min(y + radius + 1, height - 1);
            rSum += temp[(nextY * width + x) * 4] - temp[(prevY * width + x) * 4];
            gSum += temp[(nextY * width + x) * 4 + 1] - temp[(prevY * width + x) * 4 + 1];
            bSum += temp[(nextY * width + x) * 4 + 2] - temp[(prevY * width + x) * 4 + 2];
        }
    }

    return out;
}

/**
 * LUT 3D — HaldCLUT application
 * Port of Pipeline.step_lut_3d() — delegates to lut-processor.js
 */
export function stepLut3D(imageData, params = {}) {
    const { lutImageData, intensity = 1.0 } = params;
    if (!lutImageData) return imageData;
    return applyHaldCLUT(imageData, lutImageData, intensity);
}

/**
 * Vignette — Radial darkening
 * Port of Pipeline.step_vignette()
 */
export function stepVignette(imageData, params = {}) {
    const { amount = 'none' } = params;
    if (amount === 'none') return imageData;

    const levels = { sutil: 0.3, bajo: 0.3, low: 0.3, medio: 0.5, intenso: 0.75 };
    const strength = levels[amount] || 0;
    if (strength === 0) return imageData;

    const { data, width, height } = imageData;

    for (let y = 0; y < height; y++) {
        const ny = (y / height) * 2 - 1;
        for (let x = 0; x < width; x++) {
            const nx = (x / width) * 2 - 1;
            const d = Math.sqrt(nx * nx + ny * ny);
            const mask = clamp(1 - d * strength * 0.6, 0, 1);
            const idx = (y * width + x) * 4;
            data[idx] *= mask;
            data[idx + 1] *= mask;
            data[idx + 2] *= mask;
        }
    }

    return imageData;
}

/**
 * Film Grain — Noise
 * Port of Pipeline.step_grain()
 */
export function stepGrain(imageData, params = {}) {
    const { amount = 'none' } = params;
    if (amount === 'none') return imageData;

    const levels = { bajo: 5, medio: 12, alto: 25 };
    const sigma = levels[amount] || 0;
    if (sigma === 0) return imageData;

    const { data } = imageData;
    for (let i = 0; i < data.length; i += 4) {
        // Box-Muller for gaussian noise
        const u1 = Math.random() || 1e-10;
        const u2 = Math.random();
        const noise = sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        data[i] = clamp(data[i] + noise, 0, 255);
        data[i + 1] = clamp(data[i + 1] + noise, 0, 255);
        data[i + 2] = clamp(data[i + 2] + noise, 0, 255);
    }

    return imageData;
}

/**
 * Sharpen — Unsharp Mask
 * Port of Pipeline.step_sharpen()
 */
export function stepSharpen(imageData, params = {}) {
    const { amount = 'medio' } = params;
    if (amount === 'none') return imageData;

    const settings = {
        suave: { radius: 1, percent: 50 },
        medio: { radius: 2, percent: 100 },
        intenso: { radius: 2, percent: 150 },
    };
    const s = settings[amount] || settings.medio;

    const { data, width, height } = imageData;
    const blurred = boxBlur(data, width, height, s.radius);

    for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
            const diff = data[i + c] - blurred[i + c];
            data[i + c] = clamp(data[i + c] + diff * (s.percent / 100), 0, 255);
        }
    }

    return imageData;
}

/**
 * User Adjustments — Lightroom-style manual adjustments
 * Port of Pipeline.step_user_adjustments()
 */
export function stepUserAdjustments(imageData, cfg = {}) {
    if (!cfg) return imageData;

    const wbTemp = parseFloat(cfg.wb_temp || 0);
    const wbTint = parseFloat(cfg.wb_tint || 0);
    const satPct = parseFloat(cfg.sat ?? 100);
    const exposure = parseFloat(cfg.exposure || 0);
    const contrast = parseFloat(cfg.contrast || 0);
    const highlights = parseFloat(cfg.highlights || 0);
    const shadows = parseFloat(cfg.shadows || 0);
    const whites = parseFloat(cfg.whites || 0);
    const blacks = parseFloat(cfg.blacks || 0);

    if ([wbTemp, wbTint, exposure, contrast, highlights, shadows, whites, blacks].every(v => v === 0) && satPct === 100) {
        return imageData;
    }

    const ch = imageDataToFloat(imageData);
    const len = ch.r.length;

    // To linear
    const linR = new Float32Array(len);
    const linG = new Float32Array(len);
    const linB = new Float32Array(len);

    for (let i = 0; i < len; i++) {
        linR[i] = toLinear(ch.r[i]);
        linG[i] = toLinear(ch.g[i]);
        linB[i] = toLinear(ch.b[i]);
    }

    // Exposure
    if (exposure !== 0) {
        const expGain = Math.pow(2, exposure);
        for (let i = 0; i < len; i++) {
            linR[i] *= expGain;
            linG[i] *= expGain;
            linB[i] *= expGain;
        }
    }

    // Luminance for masked adjustments
    const lum = new Float32Array(len);
    for (let i = 0; i < len; i++) {
        lum[i] = luminance(linR[i], linG[i], linB[i]);
    }

    // Highlights
    if (highlights !== 0) {
        const factor = 1.0 + highlights / 200.0;
        for (let i = 0; i < len; i++) {
            const m = smoothmask(lum[i], 0.4, 0.8);
            const mult = 1.0 + (factor - 1.0) * m;
            linR[i] *= mult; linG[i] *= mult; linB[i] *= mult;
        }
    }

    // Shadows
    if (shadows !== 0) {
        const factor = 1.0 + shadows / 200.0;
        for (let i = 0; i < len; i++) {
            const m = 1.0 - smoothmask(lum[i], 0.0, 0.25);
            const mult = 1.0 + (factor - 1.0) * m;
            linR[i] *= mult; linG[i] *= mult; linB[i] *= mult;
        }
    }

    // Whites
    if (whites !== 0) {
        const factor = 1.0 + whites / 100.0;
        for (let i = 0; i < len; i++) {
            const m = smoothmask(lum[i], 0.75, 1.0);
            const mult = 1.0 + (factor - 1.0) * m;
            linR[i] *= mult; linG[i] *= mult; linB[i] *= mult;
        }
    }

    // Blacks
    if (blacks !== 0) {
        const factor = 1.0 + blacks / 100.0;
        for (let i = 0; i < len; i++) {
            const m = 1.0 - smoothmask(lum[i], 0.0, 0.1);
            const mult = 1.0 + (factor - 1.0) * m;
            linR[i] *= mult; linG[i] *= mult; linB[i] *= mult;
        }
    }

    // Soft clip
    for (let i = 0; i < len; i++) {
        if (linR[i] > 1.0) linR[i] = 1.0 + (1.0 - Math.exp(-(linR[i] - 1.0)));
        if (linG[i] > 1.0) linG[i] = 1.0 + (1.0 - Math.exp(-(linG[i] - 1.0)));
        if (linB[i] > 1.0) linB[i] = 1.0 + (1.0 - Math.exp(-(linB[i] - 1.0)));
    }

    // Back to sRGB
    for (let i = 0; i < len; i++) {
        ch.r[i] = toSRGB(clamp(linR[i], 0, 1));
        ch.g[i] = toSRGB(clamp(linG[i], 0, 1));
        ch.b[i] = toSRGB(clamp(linB[i], 0, 1));
    }

    floatToImageData(ch, imageData);

    // Color grading (temp/tint/sat) — reuse stepColorGrade
    stepColorGrade(imageData, { temp_shift: wbTemp, tint_shift: wbTint, sat: satPct / 100 });

    // Contrast via tone curve
    if (contrast !== 0) {
        stepToneCurve(imageData, { contrast: contrast / 1000 });
    }

    return imageData;
}

// ─────────────────────────────────────────────────────────
// Main Pipeline Runner
// ─────────────────────────────────────────────────────────

const STEP_MAP = {
    exposure_normalize: stepExposure,
    tone_curve: stepToneCurve,
    color_grade: stepColorGrade,
    lut_3d: stepLut3D,
    local_contrast: stepLocalContrast,
    vignette: stepVignette,
    grain: stepGrain,
    sharpen: stepSharpen,
};

/**
 * Run a complete preset pipeline on an ImageData object.
 * @param {ImageData} imageData - Source image data (mutated in place)
 * @param {Object} preset - Preset configuration with pipeline steps
 * @param {Object} [overrides] - UI overrides (noise_level, vignette_level, etc.)
 * @param {Object} [assets] - Pre-loaded assets { lutImageData }
 * @param {Function} [onProgress] - (stepIndex, totalSteps, stepName) callback
 * @returns {ImageData}
 */
export function runPipeline(imageData, preset, overrides = {}, assets = {}, onProgress = null) {
    const steps = preset.pipeline || [];

    const overrideMap = {
        grain: 'noise_level',
        vignette: 'vignette_level',
        watermark: 'logo_path',
    };

    let stepIdx = 0;
    const totalSteps = steps.length + (overrides ? 3 : 0); // +3 for post-pipeline steps

    for (const step of steps) {
        const stype = step.type;
        const params = { ...step.params };

        // Check for overrides (skip preset version if UI overrides exist)
        if (overrides && overrideMap[stype]) {
            const key = overrideMap[stype];
            if (key in overrides) {
                stepIdx++;
                continue;
            }
        }

        // Inject LUT imageData from assets
        if (stype === 'lut_3d' && assets.lutImageData) {
            params.lutImageData = assets.lutImageData;
        }

        const fn = STEP_MAP[stype];
        if (fn) {
            fn(imageData, params);
        } else {
            console.warn(`Unknown pipeline step: ${stype}`);
        }

        stepIdx++;
        if (onProgress) onProgress(stepIdx, totalSteps, stype);
    }

    return imageData;
}

/**
 * Run the compound base + creative pipeline (2-stage like Python's run_with_base)
 */
export function runCompoundPipeline(imageData, basePreset, creativePreset, overrides = {}, assets = {}, onProgress = null) {
    const creativeId = creativePreset.id || '';

    // If creative is a reference preset, use it directly
    if (creativeId.startsWith('reference_')) {
        runPipeline(imageData, creativePreset, overrides, assets, onProgress);
        stepUserAdjustments(imageData, overrides);
        return imageData;
    }

    // Stage 1: Base
    runPipeline(imageData, basePreset, {}, assets);

    // Stage 2: Creative (no exposure guard)
    runPipeline(imageData, creativePreset, overrides, assets, onProgress);

    // Stage 3: User adjustments
    stepUserAdjustments(imageData, overrides);

    return imageData;
}

// ─────────────────────────────────────────────────────────
// Canvas Helpers
// ─────────────────────────────────────────────────────────

/**
 * Resize an image on a canvas (returns new canvas)
 * Port of Pipeline.step_resize()
 */
export function resizeCanvas(sourceCanvas, longEdge) {
    if (longEdge <= 0) return sourceCanvas;

    const { width, height } = sourceCanvas;
    if (Math.max(width, height) <= longEdge) return sourceCanvas;

    let newW, newH;
    if (width >= height) {
        newW = longEdge;
        newH = Math.round(height * (longEdge / width));
    } else {
        newH = longEdge;
        newW = Math.round(width * (longEdge / height));
    }

    const canvas = document.createElement('canvas');
    canvas.width = newW;
    canvas.height = newH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(sourceCanvas, 0, 0, newW, newH);
    return canvas;
}

/**
 * Apply watermark image onto canvas
 * Port of Pipeline.step_watermark()
 */
export function applyWatermark(canvas, logoImage, position = 'bottom-right', opacity = 0.8, scale = 0.2, padding = 0.03) {
    if (!logoImage) return canvas;

    const ctx = canvas.getContext('2d');
    const targetW = Math.round(canvas.width * scale);
    const ratio = targetW / logoImage.width;
    const targetH = Math.round(logoImage.height * ratio);

    const marginX = Math.round(canvas.width * padding);
    const marginY = Math.round(canvas.height * padding);

    let x, y;
    if (position.includes('bottom')) y = canvas.height - targetH - marginY;
    else if (position.includes('top')) y = marginY;
    else y = (canvas.height - targetH) / 2;

    if (position.includes('right')) x = canvas.width - targetW - marginX;
    else if (position.includes('left')) x = marginX;
    else x = (canvas.width - targetW) / 2;

    ctx.globalAlpha = opacity;
    ctx.drawImage(logoImage, x, y, targetW, targetH);
    ctx.globalAlpha = 1.0;

    return canvas;
}

/**
 * Apply text watermark onto canvas
 * Port of Pipeline.step_text_watermark()
 */
export function applyTextWatermark(canvas, text = '', position = 'bottom-right') {
    if (!text) return canvas;

    const ctx = canvas.getContext('2d');
    const fontSize = Math.round(canvas.width * 0.03);
    ctx.font = `${fontSize}px Inter, Arial, sans-serif`;

    const margin = Math.round(canvas.width * 0.05);
    const metrics = ctx.measureText(text);
    const textW = metrics.width;
    const textH = fontSize;

    let x, y;
    if (position.includes('left')) x = margin;
    else if (position.includes('right')) x = canvas.width - textW - margin;
    else x = (canvas.width - textW) / 2;

    if (position.includes('top')) y = margin + textH;
    else if (position.includes('bottom')) y = canvas.height - margin;
    else y = (canvas.height + textH) / 2;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillText(text, x + 2, y + 2);
    // Text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(text, x, y);

    return canvas;
}

/**
 * Load an image file (File/Blob) into a canvas, apply full pipeline, return result canvas
 */
export async function processFile(file, basePreset, creativePreset, overrides = {}, assets = {}, onProgress = null) {
    // Load image
    const img = await loadImageFromFile(file);

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Run compound pipeline
    runCompoundPipeline(imageData, basePreset, creativePreset, overrides, assets, onProgress);

    // Put processed data back
    ctx.putImageData(imageData, 0, 0);

    // Post-pipeline: resize
    let resultCanvas = canvas;
    if (overrides.long_edge && overrides.long_edge > 0) {
        resultCanvas = resizeCanvas(resultCanvas, overrides.long_edge);
    }

    // Post-pipeline: watermark overlay
    if (overrides.logo_image) {
        applyWatermark(resultCanvas, overrides.logo_image, overrides.logo_pos || 'bottom-right', 0.8, (overrides.logo_scale || 20) / 100);
    }

    // Post-pipeline: text watermark
    if (overrides.watermark_text) {
        applyTextWatermark(resultCanvas, overrides.watermark_text, overrides.watermark_pos || 'bottom-right');
    }

    // Apply noise/vignette from overrides
    if (overrides.noise_level && overrides.noise_level !== 'none') {
        const rCtx = resultCanvas.getContext('2d');
        const rData = rCtx.getImageData(0, 0, resultCanvas.width, resultCanvas.height);
        stepGrain(rData, { amount: overrides.noise_level });
        rCtx.putImageData(rData, 0, 0);
    }

    if (overrides.vignette_level && overrides.vignette_level !== 'none') {
        const rCtx = resultCanvas.getContext('2d');
        const rData = rCtx.getImageData(0, 0, resultCanvas.width, resultCanvas.height);
        stepVignette(rData, { amount: overrides.vignette_level });
        rCtx.putImageData(rData, 0, 0);
    }

    return resultCanvas;
}

/**
 * Helper: Load a File into an HTMLImageElement
 */
export function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Failed to load image: ${file.name}`));
        };
        img.src = url;
    });
}

/**
 * Convert canvas to Blob for download
 */
export function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.92) {
    return new Promise((resolve) => {
        canvas.toBlob(resolve, type, quality);
    });
}
