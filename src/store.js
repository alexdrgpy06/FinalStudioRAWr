import { create } from 'zustand';

export const useStudioStore = create((set, get) => ({
  engine: window.__TAURI__ ? 'native' : 'cloud',
  files: [],
  activeFileId: null,
  outputDir: null,
  processing: false,
  progress: 0,
  currentStage: 'Ready',
  toasts: [],
  options: {
    exposure: 0.0,
    contrast: 1.0,
    saturation: 1.0,
    vibrance: 0.0,
    highlights: 0.0,
    shadows: 0.0,
    clarity: 0.0,
    denoise: false,
    adaptive_threshold: false,
    lut: null,
    watermark_text: '',
    logo: null
  },

  // Actions
  setEngine: (engine) => set({ engine }),
  setOutputDir: (outputDir) => set({ outputDir }),
  setOptions: (newOptions) => set((state) => ({ options: { ...state.options, ...newOptions } })),

  addFiles: (newFiles) => set((state) => {
    const updated = [...state.files, ...newFiles.map(f => ({
      ...f,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending'
    }))];
    return { files: updated, activeFileId: state.activeFileId || updated[0]?.id };
  }),

  setActiveFile: (activeFileId) => set({ activeFileId }),
  updateFileStatus: (id, status) => set((state) => ({
    files: state.files.map(f => f.id === id ? { ...f, status } : f)
  })),

  setProcessing: (processing) => set({ processing }),
  setProgress: (progress) => set({ progress }),
  setStage: (currentStage) => set({ currentStage }),

  clearFiles: () => set({ files: [], activeFileId: null, progress: 0, currentStage: 'Ready' }),

  addToast: (message, type = 'info') => set((state) => ({
    toasts: [...state.toasts, { id: Math.random(), message, type }]
  })),

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  }))
}));
