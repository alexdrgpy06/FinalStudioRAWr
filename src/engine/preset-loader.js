/**
 * Preset Loader
 * Loads JSON presets from bundled static files or IndexedDB.
 * Same JSON format as edge-agent/presets/*.json — zero migration.
 *
 * Port of edge-agent/preset_loader.py PresetLoader class.
 */

import { getPresetStore, getAllPresets as getStoredPresets } from '../storage/storage.js';

// Bundled preset manifest (loaded from /presets/ at runtime)
const BUNDLED_PRESET_IDS = [
    'reference_neutral_v1',
    'clasico_v1',
    'calido_v1',
    'moody_v1',
    'outdoor_vivid_v1',
    'pastel_v1',
    'vintage_v1',
    'event_flash_v1',
    'reference_neutral_boost_v1',
];

const BUNDLED_USER_PRESET_IDS = [
    'b_w_1_v1',
    'boda_calurosa_v1',
    'boda_calurosa_2_v1',
    'el_ca_o_de_la_nona_v1',
    'tia_coca_v1',
];

let presetCache = {};
let initialized = false;

/**
 * Initialize the preset loader — load bundled presets + user presets from IndexedDB
 */
export async function initPresets() {
    if (initialized) return;

    // Load bundled presets from /presets/ (shipped as static assets)
    const bundledPromises = BUNDLED_PRESET_IDS.map(async (id) => {
        try {
            const res = await fetch(`/presets/${id}.json`);
            if (res.ok) {
                const data = await res.json();
                presetCache[data.id || id] = data;
            }
        } catch (e) {
            console.warn(`Failed to load bundled preset: ${id}`, e);
        }
    });

    // Also load bundled user presets from /presets/user/
    const userBundledPromises = BUNDLED_USER_PRESET_IDS.map(async (id) => {
        try {
            const res = await fetch(`/presets/user/${id}.json`);
            if (res.ok && res.headers.get('content-type')?.includes('json')) {
                const data = await res.json();
                presetCache[data.id || id] = data;
            }
        } catch (e) {
            // Silently skip missing preset files
        }
    });

    await Promise.all([...bundledPromises, ...userBundledPromises]);

    // Load user presets from IndexedDB
    try {
        const userPresets = await getStoredPresets();
        for (const p of userPresets) {
            presetCache[p.id] = p;
        }
    } catch (e) {
        console.warn('Failed to load user presets from IndexedDB:', e);
    }

    initialized = true;
}

/**
 * Get all available presets as an array
 * @returns {{ id: string, name: string, description: string, adjustments: object }[]}
 */
export function listPresets() {
    return Object.values(presetCache).map(p => ({
        id: p.id,
        name: p.name || p.id,
        description: p.description || '',
        adjustments: p.adjustments || {},
        isUser: p.id.startsWith('user_'),
    }));
}

/**
 * Get a single preset by ID
 * @param {string} id
 * @returns {object}
 */
export function getPreset(id) {
    if (!id) throw new Error('Preset ID cannot be empty');

    if (presetCache[id]) return presetCache[id];

    // Fuzzy match
    const normalized = id.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [pid, data] of Object.entries(presetCache)) {
        const pNorm = pid.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (pNorm.includes(normalized) || normalized.includes(pNorm)) {
            return data;
        }
    }

    throw new Error(`Preset "${id}" not found`);
}

/**
 * Get the mandatory base preset (Reference Neutral V1)
 * @returns {object}
 */
export function getBasePreset() {
    try {
        return getPreset('reference_neutral_v1');
    } catch {
        // Fallback
        return {
            id: 'reference_neutral_v1',
            name: 'Reference Neutral (Fallback)',
            pipeline: [
                { type: 'exposure_normalize', params: { strength: 1.0, min_gain: 0.5, max_gain: 2.4 } }
            ]
        };
    }
}

/**
 * Resolve a preset for pipeline execution (handles v2 link presets)
 * Port of resolve_preset_for_run() from main.py / edge-agent/main.py
 *
 * @param {string} presetId
 * @returns {{ basePreset: object, creativePreset: object, adjustments: object }}
 */
export function resolvePresetForRun(presetId) {
    const preset = getPreset(presetId);
    const basePreset = getBasePreset();

    // v2 link presets
    if (preset.type === 'link') {
        const creative = preset.creative
            ? getPreset(preset.creative)
            : { id: 'empty', pipeline: [] };

        const adjustments = mergeAdjustments(
            basePreset.adjustments || null,
            preset.adjustments || null
        );

        return { basePreset, creativePreset: creative, adjustments };
    }

    // v1 normal presets
    return {
        basePreset,
        creativePreset: preset,
        adjustments: preset.adjustments || {},
    };
}

/**
 * Merge adjustment dicts (b overrides a)
 */
function mergeAdjustments(a, b) {
    if (!a && !b) return {};
    if (!a) return { ...b };
    if (!b) return { ...a };
    return { ...a, ...b };
}

/**
 * Save a user preset to cache and IndexedDB
 * @param {object} preset - Full preset object with id, name, pipeline, etc.
 */
export async function saveUserPreset(preset) {
    presetCache[preset.id] = preset;
    const store = await getPresetStore();
    await store.put(preset);
}

/**
 * Delete a user preset
 * @param {string} id
 */
export async function deleteUserPreset(id) {
    delete presetCache[id];
    const store = await getPresetStore();
    await store.delete(id);
}

/**
 * Force refresh presets from storage
 */
export async function refreshPresets() {
    initialized = false;
    presetCache = {};
    await initPresets();
}
