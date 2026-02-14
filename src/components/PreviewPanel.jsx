import React, { useRef, useCallback, useState } from 'react';
import { Upload, Download, Trash2, RefreshCw, Undo2, Redo2 } from 'lucide-react';
import { useStudioStore } from '../store/store';
import Histogram from './Histogram';

const Ring = ({ pct, size = 72 }) => {
    const r = (size - 8) / 2, c = 2 * Math.PI * r;
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="absolute">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(59,130,246)" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} className="progress-ring-circle" />
            </svg>
            <span className="text-xs font-black text-white z-10">{Math.round(pct)}%</span>
        </div>
    );
};

export default function PreviewPanel({ canvasRef, loading, onExportCurrent, onRemoveActive, thumbCache }) {
    const store = useStudioStore();
    const containerRef = useRef(null);

    // Zoom & Pan state
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const isPanning = useRef(false);
    const lastPan = useRef({ x: 0, y: 0 });

    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(z => Math.min(5, Math.max(0.5, z * delta)));
    }, []);

    const handleMouseDown = useCallback((e) => {
        if (zoom <= 1) return;
        isPanning.current = true;
        lastPan.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.style.cursor = 'grabbing';
    }, [zoom]);

    const handleMouseMove = useCallback((e) => {
        if (!isPanning.current) return;
        setPan(p => ({
            x: p.x + (e.clientX - lastPan.current.x),
            y: p.y + (e.clientY - lastPan.current.y),
        }));
        lastPan.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleMouseUp = useCallback((e) => {
        isPanning.current = false;
        e.currentTarget.style.cursor = zoom > 1 ? 'grab' : 'default';
    }, [zoom]);

    const resetZoom = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

    const hasFiles = store.files.length > 0;

    return (
        <div className="flex-1 bg-black p-2 sm:p-4 lg:p-6 flex items-center justify-center relative overflow-hidden min-h-0">
            <div className="w-full h-full relative rounded-xl lg:rounded-2xl border border-white/5 bg-zinc-950/20 flex items-center justify-center overflow-hidden">
                {!hasFiles ? (
                    <div className="text-center space-y-3 animate-fade-in p-4">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-zinc-900/50 rounded-2xl flex items-center justify-center mx-auto border border-zinc-800">
                            <Upload size={24} className="text-zinc-700" />
                        </div>
                        <p className="text-xs sm:text-sm font-black text-zinc-400 uppercase tracking-widest">Drop Files Here</p>
                        <p className="text-[9px] text-zinc-600 uppercase tracking-wider">RAW • JPG • PNG • TIFF</p>
                    </div>
                ) : (
                    <div
                        className="w-full h-full flex items-center justify-center relative"
                        onWheel={handleWheel}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
                    >
                        <div
                            className="relative group/c max-w-full max-h-full flex items-center justify-center transition-transform"
                            style={{
                                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                                transformOrigin: 'center center',
                            }}
                        >
                            <canvas ref={canvasRef} className={`max-w-full max-h-full object-contain rounded shadow-2xl transition-opacity ${loading ? 'opacity-20' : 'opacity-100'}`} style={{ maxHeight: 'calc(100vh - 160px)' }} />
                            {!loading && !store.previewError && (
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/c:opacity-100 transition-opacity">
                                    <button onClick={onExportCurrent} className="p-1.5 bg-blue-500/30 hover:bg-blue-500 backdrop-blur text-white rounded transition-all" title="Export"><Download size={13} /></button>
                                    <button onClick={onRemoveActive} className="p-1.5 bg-red-500/30 hover:bg-red-500 backdrop-blur text-white rounded transition-all" title="Remove"><Trash2 size={13} /></button>
                                </div>
                            )}
                        </div>

                        {/* Zoom indicator */}
                        {zoom !== 1 && (
                            <button onClick={resetZoom} className="absolute top-3 left-3 z-20 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 text-[9px] font-black text-white hover:bg-white/10 transition-all">
                                {Math.round(zoom * 100)}% — Reset
                            </button>
                        )}

                        {/* Undo/Redo */}
                        <div className="absolute top-3 right-3 z-20 flex gap-1">
                            <button onClick={store.undo} disabled={!store.canUndo()} className="p-1.5 bg-black/40 backdrop-blur text-zinc-400 hover:text-white disabled:opacity-20 rounded transition-all" title="Undo (Z)"><Undo2 size={13} /></button>
                            <button onClick={store.redo} disabled={!store.canRedo()} className="p-1.5 bg-black/40 backdrop-blur text-zinc-400 hover:text-white disabled:opacity-20 rounded transition-all" title="Redo (Shift+Z)"><Redo2 size={13} /></button>
                        </div>

                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Ring pct={store.previewProgress} />
                            </div>
                        )}
                        {store.previewError && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center max-w-xs">
                                    <p className="text-xs font-black text-red-400 uppercase mb-1">Preview Error</p>
                                    <p className="text-[10px] text-red-300/70">{store.previewError}</p>
                                </div>
                            </div>
                        )}

                        {/* Histogram */}
                        <Histogram sourceCanvas={canvasRef.current} visible={store.showHistogram && !loading} />
                    </div>
                )}
            </div>

            {/* Batch HUD */}
            {store.processing && (
                <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-sm bg-zinc-900/95 backdrop-blur-xl p-3 rounded-xl border border-white/5 shadow-2xl flex items-center gap-3 animate-slide-up">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                        <RefreshCw size={14} className="text-white animate-spin" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex justify-between items-center">
                            <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest truncate">{store.currentStage}</span>
                            <span className="text-sm font-black text-white ml-2">{Math.round(store.progress)}%</span>
                        </div>
                        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${store.progress}%` }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
