import React, { useRef, useCallback, useState } from 'react';
import { Upload, Download, Trash2, RefreshCw, Undo2, Redo2, Camera, Eye, EyeOff } from 'lucide-react';
import { useStudioStore } from '../store/store';
import Histogram from './Histogram';

const Ring = ({ pct, size = 64 }) => {
    const r = (size - 8) / 2, c = 2 * Math.PI * r;
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="absolute -rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(59,130,246)" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} className="transition-all duration-300" />
            </svg>
            <span className="text-xs font-black text-white z-10">{Math.round(pct)}%</span>
        </div>
    );
};

export default function PreviewPanel({ canvasRef, loading, onExportCurrent, onRemoveActive, onImport }) {
    const store = useStudioStore();

    // Zoom & Pan
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const isPanning = useRef(false);
    const lastPan = useRef({ x: 0, y: 0 });

    const handleWheel = useCallback((e) => {
        e.preventDefault();
        setZoom(z => Math.min(5, Math.max(0.5, z * (e.deltaY > 0 ? 0.9 : 1.1))));
    }, []);

    const handlePointerDown = useCallback((e) => {
        if (zoom <= 1 || e.button !== 0) return;
        isPanning.current = true;
        lastPan.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.style.cursor = 'grabbing';
    }, [zoom]);

    const handlePointerMove = useCallback((e) => {
        if (!isPanning.current) return;
        setPan(p => ({
            x: p.x + (e.clientX - lastPan.current.x),
            y: p.y + (e.clientY - lastPan.current.y),
        }));
        lastPan.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handlePointerUp = useCallback((e) => {
        isPanning.current = false;
        e.currentTarget.style.cursor = zoom > 1 ? 'grab' : 'default';
    }, [zoom]);

    const resetZoom = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

    const hasFiles = store.files.length > 0;

    return (
        <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden min-h-0">

            {!hasFiles ? (
                /* ─── Empty / Import state ─── */
                <button
                    onClick={onImport}
                    className="
            w-full h-full flex flex-col items-center justify-center gap-4 p-6
            group cursor-pointer transition-all
            hover:bg-zinc-900/20 active:bg-zinc-900/30
          "
                >
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-zinc-900/40 border-2 border-dashed border-zinc-800 group-hover:border-blue-500/40 group-hover:bg-blue-500/5 flex items-center justify-center transition-all group-active:scale-95">
                        <Camera size={32} className="text-zinc-700 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <div className="text-center space-y-1.5">
                        <p className="text-sm sm:text-base font-black text-zinc-400 group-hover:text-white transition-colors">
                            Import Photos
                        </p>
                        <p className="text-[10px] sm:text-xs text-zinc-600 group-hover:text-zinc-500 transition-colors">
                            Tap here or drag & drop files
                        </p>
                        <p className="text-[9px] text-zinc-700">RAW • JPG • PNG • TIFF • WEBP</p>
                    </div>
                </button>
            ) : (
                /* ─── Preview canvas ─── */
                <div className="w-full h-full p-1.5 sm:p-3">
                    <div className="w-full h-full relative rounded-xl border border-white/5 bg-zinc-950/30 flex items-center justify-center overflow-hidden">
                        <div
                            className="w-full h-full flex items-center justify-center relative"
                            onWheel={handleWheel}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            style={{ cursor: zoom > 1 ? 'grab' : 'default', touchAction: zoom > 1 ? 'none' : 'auto' }}
                        >
                            <div
                                className="relative group/c max-w-full max-h-full flex items-center justify-center will-change-transform"
                                style={{
                                    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                                    transformOrigin: 'center center',
                                }}
                            >
                                <canvas
                                    ref={canvasRef}
                                    className={`max-w-full max-h-full object-contain rounded shadow-2xl transition-opacity duration-200 ${loading ? 'opacity-20' : 'opacity-100'}`}
                                    style={{ maxHeight: 'calc(100dvh - 140px)' }}
                                />
                                {/* Hover actions on canvas */}
                                {!loading && !store.previewError && (
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/c:opacity-100 transition-opacity">
                                        <button onClick={onExportCurrent} className="p-1.5 bg-blue-600/60 hover:bg-blue-600 backdrop-blur text-white rounded-md transition-all" title="Export"><Download size={13} /></button>
                                        <button onClick={onRemoveActive} className="p-1.5 bg-red-500/60 hover:bg-red-500 backdrop-blur text-white rounded-md transition-all" title="Remove"><Trash2 size={13} /></button>
                                    </div>
                                )}
                            </div>

                            {/* Zoom badge */}
                            {zoom !== 1 && (
                                <button onClick={resetZoom} className="absolute top-2 left-2 z-20 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[9px] font-black text-white hover:bg-white/10 transition-all active:scale-95">
                                    {Math.round(zoom * 100)}% ✕
                                </button>
                            )}

                            {/* Toolbar: Undo/Redo + Before/After */}
                            <div className="absolute top-2 right-2 z-20 flex gap-1">
                                <button
                                    onClick={store.toggleCompare}
                                    className={`p-1.5 backdrop-blur rounded-md transition-all active:scale-90 flex items-center gap-1 ${store.compareMode
                                            ? 'bg-amber-500/80 text-white'
                                            : 'bg-black/50 text-zinc-400 hover:text-white'
                                        }`}
                                    title="Before/After (Space)"
                                >
                                    {store.compareMode ? <EyeOff size={14} /> : <Eye size={14} />}
                                    {store.compareMode && <span className="text-[8px] font-black uppercase">Before</span>}
                                </button>
                                <button onClick={store.undo} disabled={!store.canUndo()} className="p-1.5 bg-black/50 backdrop-blur text-zinc-400 hover:text-white disabled:opacity-20 rounded-md transition-all active:scale-90" title="Undo (Z)"><Undo2 size={14} /></button>
                                <button onClick={store.redo} disabled={!store.canRedo()} className="p-1.5 bg-black/50 backdrop-blur text-zinc-400 hover:text-white disabled:opacity-20 rounded-md transition-all active:scale-90" title="Redo (Shift+Z)"><Redo2 size={14} /></button>
                            </div>

                            {/* Loading ring */}
                            {loading && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <Ring pct={store.previewProgress} />
                                </div>
                            )}

                            {/* Error */}
                            {store.previewError && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center max-w-xs">
                                        <p className="text-xs font-black text-red-400 uppercase mb-1">Preview Error</p>
                                        <p className="text-[10px] text-red-300/70">{store.previewError}</p>
                                    </div>
                                </div>
                            )}

                            {/* Histogram */}
                            <Histogram sourceCanvas={canvasRef.current} visible={store.showHistogram && !loading} />
                        </div>
                    </div>
                </div>
            )}

            {/* Batch HUD */}
            {store.processing && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[92%] max-w-sm bg-zinc-900/95 backdrop-blur-xl p-3 rounded-xl border border-white/5 shadow-2xl flex items-center gap-3 z-30 animate-slide-up">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                        <RefreshCw size={14} className="text-white animate-spin" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex justify-between items-center">
                            <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest truncate">{store.currentStage}</span>
                            <span className="text-sm font-black text-white ml-2">{Math.round(store.progress)}%</span>
                        </div>
                        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${store.progress}%` }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
