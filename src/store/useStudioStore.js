
import { create } from 'zustand';

export const useStudioStore = create((set) => ({
  engine: 'native', // 'native' | 'cloud'
  files: [],
  processing: false,
  progress: 0,
  currentStage: 'Idle',
  
  // Options
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

  setEngine: (engine) => set({ engine }),
  setOptions: (newOptions) => set((state) => ({ options: { ...state.options, ...newOptions } })),
  
  addFiles: (newFiles) => set((state) => ({ 
    files: [...state.files, ...newFiles.map(f => ({
      ...f,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending'
    }))] 
  })),

  updateFileStatus: (id, status) => set((state) => ({
    files: state.files.map(f => f.id === id ? { ...f, status } : f)
  })),

  setProcessing: (processing) => set({ processing }),
  setProgress: (progress) => set({ progress }),
  setStage: (currentStage) => set({ currentStage }),
  
  clearFiles: () => set({ files: [], progress: 0 })
}));
