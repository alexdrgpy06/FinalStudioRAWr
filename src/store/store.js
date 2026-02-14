/**
 * Studio RAWr — Zustand Store
 * Centralized state management with undo/redo history for adjustments.
 */
import { create } from 'zustand';

const DEFAULT_OPTIONS = {
    // Develop
    exposure: 0.0,
    contrast: 1.0,
    highlights: 0.0,
    shadows: 0.0,
    whites: 0.0,
    blacks: 0.0,
    clarity: 0.0,

    // Color
    vibrance: 0.0,
    saturation: 1.0,
    temperature: 0.0,
    tint: 0.0,

    // Effects
    vignette: 0.0,
    grain: 0.0,
    sharpening: 0.0,

    // Denoise
    denoise: false,

    // LUT
    lut: null,
    lutImageData: null,

    // Watermark
    watermark_text: '',
    watermark_pos: 'bottom-right',
    watermark_size: 3,

    // Logo
    logo: null,
    logo_pos: 'bottom-right',
    logo_size: 15,

    // Export
    outputSize: 0,
    exportFormat: 'jpeg',
    exportQuality: 92,
};

const MAX_HISTORY = 40;

export const useStudioStore = create((set, get) => ({
    // ─── Files ─────────────────────────────────────────────
    files: [],
    activeFileId: null,

    addFiles: (newFiles) => set((s) => {
        const added = newFiles.map(f => ({
            ...f,
            id: Math.random().toString(36).substr(2, 9),
            status: 'pending',
        }));
        return {
            files: [...s.files, ...added],
            activeFileId: s.activeFileId || added[0]?.id,
        };
    }),

    setActiveFile: (id) => set({ activeFileId: id }),

    removeFile: (id) => set((s) => ({
        files: s.files.filter(f => f.id !== id),
        activeFileId: s.activeFileId === id
            ? s.files.find(f => f.id !== id)?.id || null
            : s.activeFileId,
    })),

    updateFileStatus: (id, status) => set((s) => ({
        files: s.files.map(f => f.id === id ? { ...f, status } : f),
    })),

    clearFiles: () => set({
        files: [],
        activeFileId: null,
        progress: 0,
        currentStage: 'Ready',
        previewError: null,
    }),

    // ─── Processing State ──────────────────────────────────
    processing: false,
    progress: 0,
    previewProgress: 0,
    currentStage: 'Ready',
    previewError: null,

    setProcessing: (v) => set({ processing: v }),
    setProgress: (v) => set({ progress: v }),
    setPreviewProgress: (v) => set({ previewProgress: v }),
    setStage: (v) => set({ currentStage: v }),
    setPreviewError: (v) => set({ previewError: v }),

    // ─── Options (with undo/redo) ──────────────────────────
    options: { ...DEFAULT_OPTIONS },
    _history: [{ ...DEFAULT_OPTIONS }],
    _historyIndex: 0,

    setOptions: (patch) => set((s) => {
        const next = { ...s.options, ...patch };
        // Only push to history for adjustment changes (not export/logo/watermark meta)
        const adjustKeys = [
            'exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks',
            'clarity', 'vibrance', 'saturation', 'temperature', 'tint',
            'vignette', 'grain', 'sharpening',
        ];
        const isAdjustment = adjustKeys.some(k => k in patch);

        if (isAdjustment) {
            const trimmed = s._history.slice(0, s._historyIndex + 1);
            const newHistory = [...trimmed, { ...next }].slice(-MAX_HISTORY);
            return {
                options: next,
                _history: newHistory,
                _historyIndex: newHistory.length - 1,
            };
        }
        return { options: next };
    }),

    undo: () => set((s) => {
        if (s._historyIndex <= 0) return {};
        const idx = s._historyIndex - 1;
        return {
            options: { ...s.options, ...s._history[idx] },
            _historyIndex: idx,
        };
    }),

    redo: () => set((s) => {
        if (s._historyIndex >= s._history.length - 1) return {};
        const idx = s._historyIndex + 1;
        return {
            options: { ...s.options, ...s._history[idx] },
            _historyIndex: idx,
        };
    }),

    resetOptions: () => set((s) => {
        const reset = { ...DEFAULT_OPTIONS, lut: s.options.lut, lutImageData: s.options.lutImageData, logo: s.options.logo };
        const trimmed = s._history.slice(0, s._historyIndex + 1);
        const newHistory = [...trimmed, { ...reset }].slice(-MAX_HISTORY);
        return {
            options: reset,
            _history: newHistory,
            _historyIndex: newHistory.length - 1,
        };
    }),

    canUndo: () => get()._historyIndex > 0,
    canRedo: () => get()._historyIndex < get()._history.length - 1,

    // ─── UI State ──────────────────────────────────────────
    showHistogram: false,
    compareMode: false,

    toggleHistogram: () => set((s) => ({ showHistogram: !s.showHistogram })),
    toggleCompare: () => set((s) => ({ compareMode: !s.compareMode })),
}));

export { DEFAULT_OPTIONS };
