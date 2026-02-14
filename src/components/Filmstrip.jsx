import React, { memo, useEffect, useRef } from 'react';
import { Upload, X, Loader2, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { useStudioStore } from '../store/store';

const ThumbItem = memo(({ file, isActive, thumbCache, onSelect, onExport, onRemove }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        const thumb = thumbCache?.get(file.id);
        if (!thumb?.imageData) return;

        const canvas = canvasRef.current;
        const maxEdge = 80;
        const s = Math.min(1, maxEdge / Math.max(thumb.width, thumb.height));
        const w = Math.round(thumb.width * s);
        const h = Math.round(thumb.height * s);
        canvas.width = w;
        canvas.height = h;

        // Draw downscaled
        const src = document.createElement('canvas');
        src.width = thumb.width;
        src.height = thumb.height;
        src.getContext('2d').putImageData(thumb.imageData, 0, 0);
        canvas.getContext('2d').drawImage(src, 0, 0, w, h);
    }, [file.id, thumbCache]);

    const hasThumb = thumbCache?.has(file.id);

    return (
        <div className="relative group min-w-[90px] lg:min-w-0">
            <button
                onClick={() => onSelect(file.id)}
                className={`w-full rounded-xl border transition-all overflow-hidden ${isActive ? 'border-blue-500/50 shadow-xl shadow-blue-500/10' : 'border-transparent hover:border-zinc-700'}`}
            >
                {/* Thumbnail */}
                <div className={`w-full aspect-[4/3] bg-zinc-950 flex items-center justify-center rounded-t-xl overflow-hidden ${isActive ? 'ring-1 ring-blue-500/30' : ''}`}>
                    {hasThumb ? (
                        <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
                    ) : (
                        <Loader2 size={12} className="text-zinc-700 animate-spin" />
                    )}
                </div>

                {/* Info */}
                <div className="px-1.5 py-1 bg-zinc-900/50">
                    <p className={`text-[7px] font-bold truncate ${isActive ? 'text-white' : 'text-zinc-500'}`}>{file.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                        {file.status === 'done' ? (
                            <CheckCircle2 size={7} className="text-emerald-400 shrink-0" />
                        ) : file.status === 'error' ? (
                            <AlertCircle size={7} className="text-red-400 shrink-0" />
                        ) : file.status === 'processing' ? (
                            <Loader2 size={7} className="text-blue-400 animate-spin shrink-0" />
                        ) : null}
                        <span className={`text-[6px] font-black uppercase tracking-widest ${file.status === 'done' ? 'text-emerald-500' :
                                file.status === 'error' ? 'text-red-500' :
                                    file.status === 'processing' ? 'text-blue-400' :
                                        'text-zinc-700'
                            }`}>
                            {file.status}
                        </span>
                    </div>
                </div>
            </button>

            {/* Export button */}
            {file.status === 'done' && onExport && (
                <div
                    role="button"
                    onClick={(e) => { e.stopPropagation(); onExport(file); }}
                    className="absolute top-1 left-1 w-5 h-5 rounded bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Download"
                >
                    <Download size={9} />
                </div>
            )}

            {/* Remove button */}
            <button
                onClick={(e) => { e.stopPropagation(); onRemove(file.id); }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[8px] z-10"
            >
                <X size={8} />
            </button>
        </div>
    );
});

export default function Filmstrip({ thumbCache, onImport, onExport, onRemove, onClear }) {
    const store = useStudioStore();

    return (
        <div className="h-28 sm:h-32 lg:h-auto lg:w-64 border-t lg:border-t-0 lg:border-l border-zinc-900/50 bg-[#08080A] flex flex-col shrink-0">
            <div className="hidden lg:flex p-3 border-b border-zinc-900/50 items-center justify-between">
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em]">Queue</span>
                <span className="text-[9px] font-bold text-zinc-700 bg-zinc-900 px-1.5 py-px rounded">{store.files.length}</span>
            </div>

            <div className="flex-1 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto p-2 flex lg:flex-col lg:flex-wrap gap-1.5 custom-scrollbar min-h-0">
                {/* Desktop: grid of thumbs | Mobile: horizontal scroll */}
                <div className="flex lg:grid lg:grid-cols-2 gap-1.5 min-w-max lg:min-w-0">
                    {store.files.map(f => (
                        <ThumbItem
                            key={f.id}
                            file={f}
                            isActive={store.activeFileId === f.id}
                            thumbCache={thumbCache}
                            onSelect={store.setActiveFile}
                            onExport={onExport}
                            onRemove={onRemove}
                        />
                    ))}
                </div>

                <button onClick={onImport}
                    className="min-w-[90px] lg:min-w-0 p-3 lg:p-4 rounded-xl border-2 border-dashed border-zinc-900 hover:border-zinc-700 transition-all flex flex-col items-center justify-center gap-1 text-zinc-700 hover:text-zinc-500 shrink-0">
                    <Upload size={12} /><span className="text-[7px] font-black uppercase tracking-widest">Add</span>
                </button>
            </div>

            <div className="hidden lg:block p-2 bg-[#0A0A0C]">
                <button onClick={onClear}
                    className="w-full py-2 text-[8px] font-black text-zinc-600 uppercase tracking-widest border border-zinc-900 rounded-lg hover:text-red-500 hover:bg-red-500/5 transition-all">Clear All</button>
            </div>
        </div>
    );
}
