import React, { memo, useEffect, useRef } from 'react';
import { Upload, X, Loader2, CheckCircle2, AlertCircle, Download, Trash2 } from 'lucide-react';
import { useStudioStore } from '../store/store';

const ThumbCard = memo(({ file, isActive, thumbCache, thumbVersion, onSelect, onExport, onRemove }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        const thumb = thumbCache?.get(file.id);
        if (!thumb?.imageData) return;

        const canvas = canvasRef.current;
        const maxEdge = 120;
        const s = Math.min(1, maxEdge / Math.max(thumb.width, thumb.height));
        const w = Math.round(thumb.width * s);
        const h = Math.round(thumb.height * s);
        canvas.width = w;
        canvas.height = h;

        const src = document.createElement('canvas');
        src.width = thumb.width;
        src.height = thumb.height;
        src.getContext('2d').putImageData(thumb.imageData, 0, 0);
        canvas.getContext('2d').drawImage(src, 0, 0, w, h);
    }, [file.id, thumbVersion]);

    const hasThumb = thumbCache?.has(file.id);

    return (
        <div
            onClick={() => onSelect(file.id)}
            className={`
        relative group rounded-lg overflow-hidden cursor-pointer transition-all
        border-2 active:scale-[0.97]
        ${isActive
                    ? 'border-blue-500 shadow-lg shadow-blue-500/15 ring-1 ring-blue-500/20'
                    : 'border-transparent hover:border-zinc-700'}
      `}
        >
            {/* Thumbnail area */}
            <div className="aspect-[4/3] bg-zinc-950 flex items-center justify-center overflow-hidden">
                {hasThumb ? (
                    <canvas ref={canvasRef} className="w-full h-full object-contain" />
                ) : (
                    <Loader2 size={14} className="text-zinc-700 animate-spin" />
                )}
            </div>

            {/* File info bar */}
            <div className={`px-2 py-1.5 ${isActive ? 'bg-blue-500/10' : 'bg-zinc-900/60'}`}>
                <p className={`text-[8px] font-bold truncate leading-tight ${isActive ? 'text-white' : 'text-zinc-500'}`}>{file.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                    {file.status === 'done' && <CheckCircle2 size={7} className="text-emerald-400 shrink-0" />}
                    {file.status === 'error' && <AlertCircle size={7} className="text-red-400 shrink-0" />}
                    {file.status === 'processing' && <Loader2 size={7} className="text-blue-400 animate-spin shrink-0" />}
                    <span className={`text-[6px] font-black uppercase tracking-widest ${file.status === 'done' ? 'text-emerald-500' :
                        file.status === 'error' ? 'text-red-500' :
                            file.status === 'processing' ? 'text-blue-400' : 'text-zinc-700'
                        }`}>{file.status}</span>
                </div>
            </div>

            {/* Hover actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all pointer-events-none" />
            <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {file.status === 'done' && onExport && (
                    <button onClick={(e) => { e.stopPropagation(); onExport(file); }}
                        className="w-6 h-6 rounded-md bg-emerald-500/80 hover:bg-emerald-500 text-white flex items-center justify-center transition-all">
                        <Download size={10} />
                    </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); onRemove(file.id); }}
                    className="w-6 h-6 rounded-md bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center transition-all">
                    <X size={10} />
                </button>
            </div>
        </div>
    );
});

export default function Filmstrip({ thumbCache, thumbVersion, onImport, onExport, onRemove, onClear }) {
    const store = useStudioStore();
    const hasFiles = store.files.length > 0;

    return (
        <div className="
      h-24 sm:h-28
      lg:h-auto lg:w-56 xl:w-64
      border-t lg:border-t-0 lg:border-l border-zinc-800/50
      bg-[#0A0A0C] flex flex-col shrink-0
    ">
            {/* Desktop header */}
            <div className="hidden lg:flex h-10 px-3 border-b border-zinc-800/50 items-center justify-between shrink-0">
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.15em]">Queue</span>
                <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-zinc-600 bg-zinc-900 px-1.5 py-px rounded">{store.files.length}</span>
                    {hasFiles && (
                        <button onClick={onClear} className="text-[8px] font-bold text-zinc-700 hover:text-red-400 transition-colors" title="Clear all">
                            <Trash2 size={10} />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto p-2 custom-scrollbar overscroll-contain min-h-0">

                {/* Mobile: horizontal scroll | Desktop/Tablet: grid */}
                <div className="flex lg:grid lg:grid-cols-2 gap-1.5 min-w-max lg:min-w-0">
                    {store.files.map(f => (
                        <ThumbCard
                            key={f.id}
                            file={f}
                            isActive={store.activeFileId === f.id}
                            thumbCache={thumbCache}
                            thumbVersion={thumbVersion}
                            onSelect={store.setActiveFile}
                            onExport={onExport}
                            onRemove={onRemove}
                        />
                    ))}

                    {/* Add button inline */}
                    <button onClick={onImport}
                        className="
              min-w-[80px] lg:min-w-0
              aspect-[4/3] lg:aspect-auto lg:py-6
              rounded-lg border-2 border-dashed border-zinc-800/60
              hover:border-zinc-600 hover:bg-zinc-900/30 
              transition-all flex flex-col items-center justify-center gap-1
              text-zinc-700 hover:text-zinc-400 active:scale-95 shrink-0
            ">
                        <Upload size={14} />
                        <span className="text-[7px] font-black uppercase tracking-widest">Add</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
