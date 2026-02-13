import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useStudioStore } from '../store';

const processWebImage = (canvas, options) => {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Convert to linear-ish space for processing
    const exp = Math.pow(2, options.exposure);
    const con = options.contrast;
    const sat = options.saturation;
    const vib = options.vibrance;
    const shadows = options.shadows;
    const highlights = options.highlights;

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i+1];
        let b = data[i+2];

        // 1. Exposure
        r = Math.min(255, r * exp);
        g = Math.min(255, g * exp);
        b = Math.min(255, b * exp);

        // 2. Contrast (simple pivot around 128)
        r = ((r - 128) * con) + 128;
        g = ((g - 128) * con) + 128;
        b = ((b - 128) * con) + 128;

        // 3. Shadows & Highlights
        if (shadows !== 0 || highlights !== 0) {
            const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            const norm_luma = luma / 255.0;

            // Simple quadratic falloff for shadows/highlights
            const shadow_factor = Math.pow(1.0 - norm_luma, 2) * shadows;
            const highlight_factor = Math.pow(norm_luma, 2) * highlights;

            const adj = 1.0 + shadow_factor + highlight_factor;
            r *= adj;
            g *= adj;
            b *= adj;
        }

        // 4. Saturation & Vibrance (Luma based)
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        let nr = luma + (r - luma) * sat;
        let ng = luma + (g - luma) * sat;
        let nb = luma + (b - luma) * sat;

        if (vib !== 0) {
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const current_sat = (max - min) / (max + 0.00001);
            const factor = vib * (1.0 - current_sat);
            nr += (nr - luma) * factor;
            ng += (ng - luma) * factor;
            nb += (nb - luma) * factor;
        }

        data[i] = Math.max(0, Math.min(255, nr));
        data[i+1] = Math.max(0, Math.min(255, ng));
        data[i+2] = Math.max(0, Math.min(255, nb));
    }
    ctx.putImageData(imageData, 0, 0);
};

export const Preview = () => {
    const store = useStudioStore();
    const canvasRef = useRef(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [isTauri] = useState(window.__TAURI__ !== undefined);

    const activeFile = store.files.find(f => f.id === store.activeFileId);

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
                img.onerror = () => {
                    store.addToast(`Failed to load preview for ${activeFile.name}`, 'error');
                    setPreviewLoading(false);
                };
                img.src = dataUrl;
            } catch (e) {
                console.error(e);
                store.addToast(`Failed to decode RAW: ${e}`, 'error');
                setPreviewLoading(false);
            }
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
    }, [activeFile, store.options, isTauri, store.addToast]);

    useEffect(() => {
        updatePreview();
    }, [updatePreview]);

    return (
        <div className="flex-1 bg-black p-12 flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(37,99,235,0.03)_0%,_transparent_70%)]" />
            <div className="w-full h-full relative rounded-[3rem] border border-white/5 bg-zinc-950/20 flex flex-col items-center justify-center overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                {!activeFile ? (
                    <div className="text-center space-y-6">
                       <div className="text-zinc-600 text-sm font-black uppercase tracking-widest">Select an image to start</div>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center relative">
                        <canvas ref={canvasRef} className={`max-w-[90%] max-h-[85%] rounded-lg shadow-2xl transition-opacity duration-300 ${previewLoading ? 'opacity-30' : 'opacity-100'}`} />
                        {previewLoading && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={48} /></div>}
                    </div>
                )}
            </div>
        </div>
    );
};
