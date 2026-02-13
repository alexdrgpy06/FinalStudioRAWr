import React, { useEffect } from 'react';
import { Settings, Cpu, Cloud, RefreshCw } from 'lucide-react';
import { useStudioStore } from './store';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';

// Components
import { Sidebar } from './components/Sidebar';
import { Preview } from './components/Preview';
import { Filmstrip } from './components/Filmstrip';
import { ToastContainer } from './components/Toast';

function App() {
  const store = useStudioStore();
  const isTauri = window.__TAURI__ !== undefined;

  // Global Keybindings & Tauri Listeners
  useEffect(() => {
    if (isTauri) {
      const unlisten = listen('process-progress', (event) => {
        const { progress, stage, error, success, path } = event.payload;
        store.setProgress(progress);
        store.setStage(stage);

        if (error) {
            console.error(`Error processing ${path}:`, error);
            store.addToast(`Error processing ${path}: ${error}`, 'error');
        } else if (success && progress === 100) {
             // Maybe notify completion of batch?
        }
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

  return (
    <div className="flex h-screen bg-[#050506] text-zinc-300 font-sans selection:bg-blue-500/30 overflow-hidden border border-zinc-900/50 rounded-lg relative">

      <ToastContainer />
      
      {/* Sidebar Controls */}
      <div className="flex flex-col w-[340px] bg-[#08080A] border-r border-zinc-900 z-20 shadow-2xl">
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

        <Sidebar />
      </div>

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

        <div className="flex-1 flex overflow-hidden relative">
          {/* Central Preview Area */}
          <Preview />

          {/* Float HUD - Progress Overlay */}
          {store.processing && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-lg bg-zinc-900/90 backdrop-blur-3xl p-6 rounded-[2rem] border border-white/5 shadow-2xl flex items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 z-50">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                        <RefreshCw size={20} className="text-white animate-spin" />
                    </div>
                    <div className="flex-1 space-y-3">
                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <span className="block text-[8px] font-black text-blue-500 uppercase tracking-widest">{store.currentStage}</span>
                                {/* <span className="block text-xs font-black text-white uppercase truncate max-w-[200px] tracking-tight">{activeFile?.name}</span> */}
                            </div>
                            <span className="text-xl font-black text-white">{Math.round(store.progress)}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-500" style={{ width: `${store.progress}%` }} />
                        </div>
                    </div>
                </div>
            )}

          {/* Media Browser (Filmstrip) */}
          <Filmstrip />
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
                <span className="text-zinc-700">BUILD 2.6.0 REMAKE</span>
                <button className="p-2 hover:bg-zinc-900 rounded-lg transition-colors"><Settings size={12} /></button>
           </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
