import React from 'react';
import { ImageIcon, Upload } from 'lucide-react';
import { useStudioStore } from '../store';
import { open } from '@tauri-apps/plugin-dialog';

export const Filmstrip = () => {
    const store = useStudioStore();
    const isTauri = window.__TAURI__ !== undefined;

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
    );
}
