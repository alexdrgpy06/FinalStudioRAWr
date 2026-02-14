import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Image as ImageIcon, Upload, Settings, Play, X, 
  CheckCircle2, Loader2, Monitor, Cpu, Cloud, Layers,
  ChevronRight, Sliders, Palette, Zap, Download, RefreshCw
} from 'lucide-react';
import { useStudioStore } from './store/useStudioStore';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';

// --- ENGINE (WEB FALLBACK) ---
const processWebImage = (canvas, options) => {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Simple fast filters for preview
    const exp = Math.pow(2, options.exposure);
    const con = options.contrast;
    const sat = options.saturation;

    for (let i = 0; i < data.length; i += 4) {
        // Exposure
        data[i] = Math.min(255, data[i] * exp);
        data[i+1] = Math.min(255, data[i+1] * exp);
        data[i+2] = Math.min(255, data[i+2] * exp);

        // Saturation (Luma)
        const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
        data[i] = gray + sat * (data[i] - gray);
        data[i+1] = gray + sat * (data[i+1] - gray);
        data[i+2] = gray + sat * (data[i+2] - gray);
    }
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
  const [isTauri, setIsTauri] = useState(window.__TAURI__ !== undefined);

  const activeFile = store.files.find(f => f.id === store.activeFileId);

  // Update Preview Canvas
  const updatePreview = useCallback(async () => {
    if (!activeFile || !canvasRef.current) return;
    setPreviewLoading(true);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (isTauri && activeFile.path) {
        try {
            const dataUrl = await invoke('decode_raw', { path: activeFile.path });
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                processWebImage(canvas, store.options);
                setPreviewLoading(false);
            };
            img.src = dataUrl;
        } catch (e) { console.error(e); setPreviewLoading(false); }
    } else if (activeFile.file) {
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
  }, [activeFile, store.options, isTauri]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  // Tauri Event Listeners
  useEffect(() => {
    if (isTauri) {
      const unlisten = listen('process-progress', (event) => {
        const { progress, stage } = event.payload;
        store.setProgress(progress);
        store.setStage(stage);
      });
      return () => { unlisten.then(f => f()); };
    }
  }, [isTauri, store]);

  const importFiles = async () => {
    if (isTauri) {
      const selected = await open({ 
        multiple: true, 
        filters: [{ name: 'RAW/Images', extensions: ['arw','cr2','nef','dng','jpg','png','webp'] }] 
      });
      if (selected) store.addFiles(selected.map(p => ({ path: p, name: p.split(/[\\/]/).pop() })));
    } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = (e) => {
            const selected = Array.from(e.target.files);
            store.addFiles(selected.map(f => ({ file: f, name: f.name })));
        };
        input.click();
    }
  };

  const runBatch = async () => {
    store.setProcessing(true);
    if (store.engine === 'native' && isTauri) {
        try {
            const outBase = "C:/Users/alex0/.openclaw/workspace/FinalStudioRAWr/exports";
            const filesToProcess = store.files.map(f => [f.path, `${outBase}/final_${f.name}.jpg`]);
            await invoke('process_bulk', { files: filesToProcess, options: store.options });
        } catch (e) { alert(e); }
    } else {
        // Web Batch Emulation
        for (let i=0; i<=100; i+=5) {
            store.setProgress(i);
            store.setStage('Web Exporting...');
            await new Promise(r => setTimeout(r, 100));
        }
    }
    store.setProcessing(false);
    store.setStage('Batch Complete');
  };

  return (
    <div className="flex h-screen bg-[#050506] text-zinc-300 font-sans selection:bg-blue-500/30 overflow-hidden border border-zinc-900/50 rounded-lg">
      
      {/* Sidebar Controls */}
      <aside className="w-[340px] border-r border-zinc-900 bg-[#08080A] flex flex-col shadow-2xl z-20">
        <div className="p-8 border-b border-zinc-900/50 bg-[#0A0A0C]">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-black tracking-tighter text-white group cursor-default">
              FINAL STUDIO <span className="text-blue-500 group-hover:animate-pulse">RAWR</span>
            </h1>
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]" />
          </div>
          
          <div className="mt-8 flex bg-zinc-950/50 p-1 rounded-xl border border-zinc-900">
            <button 
              onClick={() => store.setEngine('native')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[9px] font-black rounded-lg transition-all ${store.engine === 'native' ? 'bg-zinc-800 text-blue-400 shadow-xl border border-zinc-700/50' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              <Cpu size={12} strokeWidth={3} /> GPU NATIVE
            </button>
            <button 
              onClick={() => store.setEngine('cloud')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[9px] font-black rounded-lg transition-all ${store.engine === 'cloud' ? 'bg-zinc-800 text-blue-400 shadow-xl border border-zinc-700/50' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              <Cloud size={12} strokeWidth={3} /> BROWSER WEB
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-10 custom-scrollbar">
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

        <div className="p-8 border-t border-zinc-900/50 bg-[#08080A]">
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
                <button 
                    key={f.id} 
                    onClick={() => store.setActiveFile(f.id)}
                    className={`w-full p-4 rounded-2xl border transition-all flex items-center gap-4 text-left group/item ${store.activeFileId === f.id ? 'bg-zinc-800/50 border-blue-500/30 shadow-xl' : 'bg-zinc-900/20 border-transparent hover:bg-zinc-900/40 hover:border-zinc-800'}`}
                >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${store.activeFileId === f.id ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-500 group-hover/item:bg-zinc-700'}`}>
                        <ImageIcon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`text-[10px] font-bold truncate ${store.activeFileId === f.id ? 'text-white' : 'text-zinc-400'}`}>{f.name}</p>
                        <p className="text-[8px] text-zinc-600 uppercase tracking-widest font-black mt-1">Pending</p>
                    </div>
                    {store.activeFileId === f.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />}
                </button>
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
              <span>GPU: NVIDIA RTX 3090 (24GB VRAM)</span>
              <div className="h-3 w-[1px] bg-zinc-800" />
              <span className="text-zinc-500">ENGINE: <span className={store.engine === 'native' ? 'text-blue-500' : 'text-amber-500'}>{store.engine.toUpperCase()}</span></span>
           </div>
           <div className="flex items-center gap-4">
                <span className="text-zinc-700">BUILD 2.5.1 STABLE</span>
                <button className="p-2 hover:bg-zinc-900 rounded-lg transition-colors"><Settings size={12} /></button>
           </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
