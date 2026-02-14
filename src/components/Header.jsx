import React from 'react';
import { Menu, Upload } from 'lucide-react';

export default function Header({ fileCount, onImport, onToggleSidebar }) {
    return (
        <header className="h-12 border-b border-zinc-900/50 flex items-center justify-between px-3 sm:px-5 bg-[#08080A]/80 backdrop-blur-xl z-10 shrink-0">
            <div className="flex items-center gap-3">
                <button className="lg:hidden text-zinc-400 p-1" onClick={onToggleSidebar}><Menu size={20} /></button>
                <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                    <span className="hidden sm:inline uppercase tracking-widest">Browser Engine</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[8px] font-bold text-zinc-700 hidden sm:block">{fileCount} file{fileCount !== 1 ? 's' : ''}</span>
                <button onClick={onImport}
                    className="bg-white text-black px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95">
                    Import
                </button>
            </div>
        </header>
    );
}
