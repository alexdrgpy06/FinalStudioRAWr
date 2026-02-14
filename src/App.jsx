import React, { useState, useEffect, useRef, useCallback } from 'react';
import FileListItem from './components/FileListItem';
import { 
  Image as ImageIcon, Upload, Settings, Play, X, 
  CheckCircle2, Loader2, Monitor, Cpu, Cloud, Layers,
  ChevronRight, Sliders, Palette, Zap, Download, RefreshCw, FolderOpen
} from 'lucide-react';
import { create } from 'zustand';

// --- STORE ---
export const useStudioStore = create((set) => ({
  engine: 'cloud',
  files: [],
  activeFileId: null,
  outputDir: null,
  processing: false,
  progress: 0,
  currentStage: 'Ready',
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
  clearFiles: () => set({ files: [], activeFileId: null, progress: 0, currentStage: 'Ready' })
}));

const PRESETS = [
    { name: 'Cinematic', options: { exposure: 0.1, contrast: 1.2, saturation: 1.1, vibrance: 0.2, shadows: -0.1, highlights: -0.2 } },
    { name: 'B&W High', options: { exposure: 0.0, contrast: 1.3, saturation: 0, vibrance: 0, shadows: -0.2, highlights: 0.1 } },
    { name: 'Vintage', options: { exposure: 0.05, contrast: 1.1, saturation: 0.8, vibrance: 0.1, shadows: 0.1, highlights: -0.1 } },
    { name: 'Soft', options: { exposure: 0.1, contrast: 0.9, saturation: 0.9, vibrance: 0.0, clarity: -0.2 } },
    { name: 'Punchy', options: { exposure: 0.0, contrast: 1.25, saturation: 1.2, vibrance: 0.3, highlights: 0.1, shadows: -0.1 } },
];

// --- ENGINE ---
import { isRawFile, decodeRawFile } from './engine/raw-decoder';
import { runCompoundPipeline, processFile } from './engine/image-engine';
import { getBasePreset, initPresets } from './engine/preset-loader';

const processWebImage = async (canvas, options) => {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Map UI options to pipeline format
    const basePreset = getBasePreset();
    const creativePreset = { id: 'temp', pipeline: [] }; // Neutral
    
    const overrides = {
        exposure: options.exposure,
        contrast: (options.contrast - 1) * 100, // convert back to % relative to 1.0
        sat: options.saturation * 100,
        vibrance: options.vibrance * 100,
        highlights: options.highlights * 100,
        shadows: options.shadows * 100,
        noise_level: options.denoise ? 'medio' : 'none',
    };

    runCompoundPipeline(imageData, basePreset, creativePreset, overrides);
    ctx.putImageData(imageData, 0, 0);
};

// --- UI COMPONENTS ---
const ControlSlider = ({ label, value, min, max, step, onChange, unit = "" }) => (
  <div className="group space-y-2 mb-5">
    <div className="flex justify-between items-center px-1">
      <span className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.15em] group-hover:text-zinc-300 transition-colors">{label}</span>
      <span className="text-blue-400 font-mono text-[10px] font-bold bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10">{value}{unit}</span>
    </div>
    <input 
      type="range" min={min} max={max} step={step} 
      value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-[3px] bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:bg-zinc-700 transition-all"
    />
  </div>
);

const SidebarHeader = ({ icon: Icon, title }) => (
    <div className="flex items-center gap-2 mb-6 mt-2 opacity-50">
        <Icon size={12} className="text-blue-500" />
        <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{title}</h2>
    </div>
);

// --- MAIN APP ---
function App() {
  const store = useStudioStore();
  const canvasRef = useRef(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const activeFile = store.files.find(f => f.id === store.activeFileId);

  // Update Preview Canvas
  const updatePreview = useCallback(async () => {
    if (!activeFile || !canvasRef.current) return;
    setPreviewLoading(true);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    try {
        if (activeFile.file) {
            // Check if RAW
            if (isRawFile(activeFile.name)) {
                const { imageData } = await decodeRawFile(activeFile.file, { fast: true });
                canvas.width = imageData.width;
                canvas.height = imageData.height;
                ctx.putImageData(imageData, 0, 0);
                processWebImage(canvas, store.options);
                setPreviewLoading(false);
            } else {
                const url = URL.createObjectURL(activeFile.file);
                const img = new Image();
                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    processWebImage(canvas, store.options);
                    URL.revokeObjectURL(url);
                    setPreviewLoading(false);
                };
                img.src = url;
            }
        }
    } catch (e) { 
        console.error("Preview Update Failed:", e); 
        setPreviewLoading(false); 
    }
  }, [activeFile, store.options]);

  useEffect(() => {
    initPresets().then(() => updatePreview());
  }, [updatePreview]);

  const importFiles = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
        const selected = Array.from(e.target.files);
        store.addFiles(selected.map(f => ({ file: f, name: f.name })));
    };
    input.click();
  };

    const runBatch = async () => {
        store.setProcessing(true);
        // Web Batch Implementation
        for (let i = 0; i < store.files.length; i++) {
            const f = store.files[i];
            store.setStage(`Processing ${f.name}...`);
            store.setProgress((i / store.files.length) * 100);

            try {
                const canvas = await processFile(f.file, getBasePreset(), { id: 'temp', pipeline: [] }, {
                    exposure: store.options.exposure,
                    contrast: (store.options.contrast - 1) * 100,
                    sat: store.options.saturation * 100,
                    vibrance: store.options.vibrance * 100,
                    highlights: store.options.highlights * 100,
                    shadows: store.options.shadows * 100,
                    noise_level: store.options.denoise ? 'medio' : 'none',
                });

                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
                const url = URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                link.download = `final_${f.name.split('.')[0]}.jpg`;
                link.click();
                URL.revokeObjectURL(url);
            } catch (err) {
                console.error(`Failed to process ${f.name}:`, err);
            }
        }
        store.setProgress(100);
        store.setProcessing(false);
        store.setStage('Batch Complete');
    };

  // --- DRAG & DROP HANDLERS ---
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    // Only set to false if we are leaving the main container
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const selected = Array.from(e.dataTransfer.files);
        store.addFiles(selected.map(f => ({ file: f, name: f.name })));
    }
  };

  return (
    <div
        className="flex h-screen bg-[#050506] text-zinc-300 font-sans selection:bg-blue-500/30 overflow-hidden border border-zinc-900/50 rounded-lg relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-blue-500/20 backdrop-blur-sm border-4 border-blue-500 flex items-center justify-center pointer-events-none animate-in fade-in duration-200">
            <div className="bg-zinc-900/90 p-8 rounded-3xl border border-blue-500/50 shadow-2xl flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center animate-bounce">
                    <Upload size={40} className="text-blue-500" />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Release to Import</h2>
                <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Drop files to add to queue</p>
            </div>
        </div>
      )}
      
      {/* Sidebar Controls */}
      <aside className="w-[340px] border-r border-zinc-900 bg-[#08080A] flex flex-col shadow-2xl z-20">
        <div className="p-8 border-b border-zinc-900/50 bg-[#0A0A0C]">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-black tracking-tighter text-white group cursor-default">
              FINAL STUDIO <span className="text-blue-500 group-hover:animate-pulse">CLOUD</span>
            </h1>
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
          </div>
          
          <div className="mt-8 flex bg-zinc-950/50 p-1 rounded-xl border border-zinc-900">
            <button 
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[9px] font-black rounded-lg transition-all bg-zinc-800 text-blue-400 shadow-xl border border-zinc-700/50`}
            >
              <Cloud size={12} strokeWidth={3} /> BROWSER WEB
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-10 custom-scrollbar">
          <section>
            <SidebarHeader icon={Layers} title="Quick Presets" />
            <div className="grid grid-cols-2 gap-2">
                {PRESETS.map(preset => (
                    <button
                        key={preset.name}
                        onClick={() => store.setOptions(preset.options)}
                        className="py-3 px-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[9px] font-black uppercase hover:bg-zinc-800 hover:border-zinc-700 hover:text-blue-400 transition-all text-zinc-500"
                    >
                        {preset.name}
                    </button>
                ))}
            </div>
          </section>

          <section>
            <SidebarHeader icon={Sliders} title="Develop Engine" />
            <ControlSlider label="Exposure" value={store.options.exposure} min={-4} max={4} step={0.01} onChange={(v) => store.setOptions({ exposure: v })} />
            <ControlSlider label="Contrast" value={store.options.contrast} min={0} max={2} step={0.01} onChange={(v) => store.setOptions({ contrast: v })} />
            <ControlSlider label="Highlights" value={store.options.highlights} min={-1} max={1} step={0.01} onChange={(v) => store.setOptions({ highlights: v })} />
            <ControlSlider label="Shadows" value={store.options.shadows} min={-1} max={1} step={0.01} onChange={(v) => store.setOptions({ shadows: v })} />
          </section>

          <section>
            <SidebarHeader icon={Palette} title="Color & Grading" />
            <ControlSlider label="Vibrance" value={store.options.vibrance} min={-1} max={1} step={0.01} onChange={(v) => store.setOptions({ vibrance: v })} />
            <ControlSlider label="Saturation" value={store.options.saturation} min={0} max={2} step={0.01} onChange={(v) => store.setOptions({ saturation: v })} />
            <div className="pt-4">
                <button className="w-full py-4 px-5 bg-zinc-950 border border-zinc-800 rounded-2xl text-[10px] font-black flex items-center justify-between group hover:border-blue-500/40 hover:bg-zinc-900 transition-all shadow-lg shadow-black/50">
                  <span className="flex items-center gap-3"><Layers size={14} className="text-zinc-500 group-hover:text-blue-500" /> LOAD 3D LUT (.CUBE)</span>
                  <ChevronRight size={12} className="text-zinc-700" />
                </button>
            </div>
          </section>

          <section>
            <SidebarHeader icon={Zap} title="Branding" />
            <div className="space-y-4">
                <input 
                    type="text" 
                    placeholder="TEXT WATERMARK"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-[10px] font-bold focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700"
                    value={store.options.watermark_text}
                    onChange={(e) => store.setOptions({ watermark_text: e.target.value })}
                />
                <button className="w-full py-4 px-5 bg-zinc-950 border border-zinc-800 rounded-xl text-[10px] font-black flex items-center justify-between group hover:border-blue-500/40 transition-all">
                  <span className="flex items-center gap-3"><ImageIcon size={14} className="text-zinc-500 group-hover:text-blue-500" /> SELECT LOGO (PNG)</span>
                  <Upload size={12} className="text-zinc-700" />
                </button>
            </div>
          </section>
        </div>

        <div className="p-8 border-t border-zinc-900/50 bg-[#08080A] space-y-4">
          <button 
            disabled={store.processing || store.files.length === 0}
            onClick={runBatch}
            className="group w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-20 disabled:grayscale rounded-3xl text-xs font-black text-white shadow-2xl shadow-blue-900/40 transition-all flex items-center justify-center gap-3"
          >
            {store.processing ? <Loader2 className="animate-spin" size={18} /> : (
                <><Play size={14} fill="white" /> EXECUTE BATCH</>
            )}
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col bg-[#050506]">
        {/* Navigation Bar */}
        <header className="h-20 border-b border-zinc-900/50 flex items-center justify-between px-10 bg-[#08080A]/80 backdrop-blur-xl z-10">
          <div className="flex gap-10">
            {['develop', 'library', 'batch'].map(tab => (
              <button key={tab} className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:text-white ${tab === 'develop' ? 'text-blue-500' : 'text-zinc-600'}`}>{tab}</button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <button 
                onClick={importFiles}
                className="bg-white text-black px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-white/5 active:scale-95"
            >
                Import Assets
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Central Preview Area */}
          <div className="flex-1 bg-black p-12 flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(37,99,235,0.03)_0%,_transparent_70%)]" />
            
            <div className="w-full h-full relative rounded-[3rem] border border-white/5 bg-zinc-950/20 flex flex-col items-center justify-center overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]">
               {store.files.length === 0 ? (
                 <div className="text-center space-y-6">
                    <div className="w-24 h-24 bg-zinc-900/50 rounded-[2.5rem] flex items-center justify-center mx-auto border border-zinc-800 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                      <Upload size={32} className="text-zinc-700" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm font-black text-zinc-400 uppercase tracking-widest">Awaiting Input</p>
                        <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em]">Drop RAW or Image files here</p>
                    </div>
                 </div>
               ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center relative">
                    <canvas ref={canvasRef} className={`max-w-[90%] max-h-[85%] rounded-lg shadow-2xl transition-opacity duration-300 ${previewLoading ? 'opacity-30' : 'opacity-100'}`} />
                    {previewLoading && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={48} /></div>}
                 </div>
               )}
            </div>
            
            {/* Float HUD - Progress Overlay */}
            {store.processing && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-lg bg-zinc-900/90 backdrop-blur-3xl p-6 rounded-[2rem] border border-white/5 shadow-2xl flex items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                        <RefreshCw size={20} className="text-white animate-spin" />
                    </div>
                    <div className="flex-1 space-y-3">
                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <span className="block text-[8px] font-black text-blue-500 uppercase tracking-widest">{store.currentStage}</span>
                                <span className="block text-xs font-black text-white uppercase truncate max-w-[200px] tracking-tight">{activeFile?.name}</span>
                            </div>
                            <span className="text-xl font-black text-white">{Math.round(store.progress)}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-500" style={{ width: `${store.progress}%` }} />
                        </div>
                    </div>
                </div>
            )}
          </div>

          {/* Media Browser (Filmstrip) */}
          <div className="w-80 border-l border-zinc-900/50 bg-[#08080A] flex flex-col">
            <div className="p-6 border-b border-zinc-900/50">
                <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em]">Source Queue</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {store.files.map(f => (
                <FileListItem
                  key={f.id}
                  file={f}
                  isActive={store.activeFileId === f.id}
                  onSelect={store.setActiveFile}
                />
              ))}
              <button 
                onClick={importFiles}
                className="w-full p-8 rounded-2xl border-2 border-dashed border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/10 transition-all flex flex-col items-center gap-2"
              >
                 <Upload size={16} className="text-zinc-700" />
                 <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Add Files</span>
              </button>
            </div>
            
            <div className="p-6 bg-[#0A0A0C]">
                <button 
                    onClick={store.clearFiles}
                    className="w-full py-4 text-[9px] font-black text-zinc-600 uppercase tracking-widest border border-zinc-900 rounded-xl hover:text-red-500 hover:bg-red-500/5 hover:border-red-500/10 transition-all"
                >
                    Purge Session
                </button>
            </div>
          </div>
        </div>

        {/* Global System Status */}
        <footer className="h-14 border-t border-zinc-900/50 bg-[#08080A] px-10 flex items-center justify-between text-[9px] font-black text-zinc-600 tracking-[0.1em]">
           <div className="flex gap-8 items-center">
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                 <span>SYSTEM: ONLINE</span>
              </div>
              <div className="h-3 w-[1px] bg-zinc-800" />
              <span>CLOUD DEPLOYMENT</span>
              <div className="h-3 w-[1px] bg-zinc-800" />
              <span className="text-zinc-500">ENGINE: <span className="text-blue-500">CLOUD WASM</span></span>
           </div>
           <div className="flex items-center gap-4">
                <span className="text-zinc-700">BUILD 2.6.0 CLOUD</span>
                <button className="p-2 hover:bg-zinc-900 rounded-lg transition-colors"><Settings size={12} /></button>
           </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
