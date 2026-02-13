import React, { useState, useEffect } from 'react';
import { 
  Image as ImageIcon, Upload, Settings, Play, X, 
  CheckCircle2, Loader2, Monitor, Cpu, Cloud, Layers 
} from 'lucide-react';
import { useStudioStore } from './store/useStudioStore';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';

const ControlSlider = ({ label, value, min, max, step, onChange, unit = "" }) => (
  <div className="space-y-2 mb-4">
    <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-500 tracking-wider">
      <span>{label}</span>
      <span className="text-blue-400">{value}{unit}</span>
    </div>
    <input 
      type="range" min={min} max={max} step={step} 
      value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
    />
  </div>
);

const FileItem = ({ file }) => (
  <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center gap-3">
    <div className="w-10 h-10 bg-zinc-800 rounded flex items-center justify-center">
      <ImageIcon size={16} className="text-zinc-500" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium truncate">{file.name}</p>
      <p className="text-[10px] text-zinc-500 uppercase tracking-tight">{file.status}</p>
    </div>
    {file.status === 'complete' && <CheckCircle2 size={14} className="text-green-500" />}
    {file.status === 'processing' && <Loader2 size={14} className="animate-spin text-blue-500" />}
  </div>
);

function App() {
  const { 
    engine, setEngine, files, addFiles, options, setOptions, 
    processing, setProcessing, progress, setProgress, currentStage, setStage 
  } = useStudioStore();

  const [activeTab, setActiveTab] = useState('develop');

  useEffect(() => {
    if (window.__TAURI__) {
      const unlisten = listen('process-progress', (event) => {
        const { progress: p, stage: s } = event.payload;
        setProgress(p);
        setStage(s);
      });
      return () => { unlisten.then(f => f()); };
    }
  }, [setProgress, setStage]);

  const selectFiles = async () => {
    if (window.__TAURI__) {
      const selected = await open({ multiple: true, filters: [{ name: 'RAW/Images', extensions: ['arw','cr2','nef','dng','jpg','png'] }] });
      if (selected) addFiles(selected.map(p => ({ path: p, name: p.split(/[\\/]/).pop(), status: 'pending' })));
    }
  };

  const executeBatch = async () => {
    setProcessing(true);
    if (engine === 'native') {
      try {
        const filePairs = files.map(f => [f.path, `${f.path}_processed.jpg`]);
        await invoke('process_bulk', { files: filePairs, options });
      } catch (e) { alert(e); }
    } else {
      // Browser processing placeholder
      for (let i=0; i<=100; i+=10) {
        setProgress(i);
        setStage('Cloud Processing...');
        await new Promise(r => setTimeout(r, 200));
      }
    }
    setProcessing(false);
  };

  return (
    <div className="flex h-screen bg-[#050505] text-zinc-200 font-sans selection:bg-blue-500/30 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 border-r border-zinc-900 bg-[#0A0A0C] flex flex-col">
        <div className="p-6 border-b border-zinc-900">
          <h1 className="text-lg font-black tracking-tighter text-white">FINAL STUDIO <span className="text-blue-500">RAWR</span></h1>
          <div className="mt-4 flex bg-zinc-900 p-1 rounded-lg">
            <button 
              onClick={() => setEngine('native')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold rounded-md transition-all ${engine === 'native' ? 'bg-zinc-800 text-blue-400 shadow-xl' : 'text-zinc-500'}`}
            >
              <Cpu size={12} /> GPU NATIVE
            </button>
            <button 
              onClick={() => setEngine('cloud')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold rounded-md transition-all ${engine === 'cloud' ? 'bg-zinc-800 text-blue-400 shadow-xl' : 'text-zinc-500'}`}
            >
              <Cloud size={12} /> BROWSER WEB
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          <section>
            <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-6">Develop Engine</h2>
            <ControlSlider label="Exposure" value={options.exposure} min={-4} max={4} step={0.1} onChange={(v) => setOptions({ exposure: v })} />
            <ControlSlider label="Contrast" value={options.contrast} min={0} max={2} step={0.1} onChange={(v) => setOptions({ contrast: v })} />
            <ControlSlider label="Highlights" value={options.highlights} min={-1} max={1} step={0.1} onChange={(v) => setOptions({ highlights: v })} />
            <ControlSlider label="Shadows" value={options.shadows} min={-1} max={1} step={0.1} onChange={(v) => setOptions({ shadows: v })} />
          </section>

          <section>
            <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-6">Presence & Color</h2>
            <ControlSlider label="Clarity" value={options.clarity} min={-1} max={1} step={0.1} onChange={(v) => setOptions({ clarity: v })} />
            <ControlSlider label="Vibrance" value={options.vibrance} min={-1} max={1} step={0.1} onChange={(v) => setOptions({ vibrance: v })} />
            <ControlSlider label="Saturation" value={options.saturation} min={0} max={2} step={0.1} onChange={(v) => setOptions({ saturation: v })} />
          </section>

          <section>
             <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-6">Advanced</h2>
             <div className="space-y-4">
                <button className="w-full py-3 px-4 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold flex items-center justify-between group hover:border-blue-500/50 transition-all">
                  <span className="flex items-center gap-2"><Layers size={14} className="text-zinc-500 group-hover:text-blue-400" /> LOAD 3D LUT</span>
                  <span className="text-[9px] text-zinc-600">.CUBE</span>
                </button>
             </div>
          </section>
        </div>

        <div className="p-6 border-t border-zinc-900 space-y-4 bg-[#08080A]">
          <button 
            disabled={processing || files.length === 0}
            onClick={executeBatch}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:grayscale rounded-2xl text-sm font-black text-white shadow-2xl shadow-blue-900/20 transition-all"
          >
            {processing ? <Loader2 className="animate-spin mx-auto" /> : `RENDER ${files.length} ASSETS`}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="h-16 border-b border-zinc-900 flex items-center justify-between px-8 bg-[#0A0A0C]">
          <div className="flex gap-8">
            {['develop', 'library', 'export'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === tab ? 'text-blue-500' : 'text-zinc-600 hover:text-zinc-400'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button 
            onClick={selectFiles}
            className="bg-zinc-100 text-black px-5 py-2 rounded-full text-xs font-bold hover:bg-white transition-all shadow-xl"
          >
            IMPORT MEDIA
          </button>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Workspace Area */}
          <div className="flex-1 bg-black p-12 flex flex-col items-center justify-center relative">
            <div className="w-full max-w-4xl aspect-video rounded-3xl border border-zinc-900 bg-zinc-950/50 flex flex-col items-center justify-center group overflow-hidden shadow-3xl">
               {files.length === 0 ? (
                 <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto ring-1 ring-zinc-800 shadow-inner">
                      <Upload size={24} className="text-zinc-700" />
                    </div>
                    <p className="text-sm font-medium text-zinc-500 tracking-tight">Drop your RAW assets to begin development</p>
                 </div>
               ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center text-zinc-800 font-black text-6xl">
                    PREVIEW ENGINE
                 </div>
               )}
            </div>
            
            {/* Realtime Status Overlay */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-md bg-zinc-900/80 backdrop-blur-2xl p-4 rounded-2xl border border-zinc-800/50 shadow-2xl flex items-center gap-4">
               <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-[9px] font-bold text-zinc-500 uppercase">
                    <span>{currentStage}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
               </div>
            </div>
          </div>

          {/* Filmstrip (Right) */}
          <div className="w-80 border-l border-zinc-900 bg-[#0A0A0C] p-6 overflow-y-auto custom-scrollbar">
            <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-6">Media Queue</h3>
            <div className="space-y-3">
              {files.map(f => <FileItem key={f.id} file={f} />)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="h-12 border-t border-zinc-900 bg-[#0A0A0C] px-8 flex items-center justify-between text-[9px] font-bold text-zinc-600">
           <div className="flex gap-6">
              <span>DEVICE: ZF3090-HOST</span>
              <span className="text-blue-500/50">RTX 3090 ACCELERATION ENABLED</span>
           </div>
           <div>FINAL STUDIO RAWR v1.0.0 (STABLE)</div>
        </footer>
      </main>
    </div>
  );
}

export default App;
