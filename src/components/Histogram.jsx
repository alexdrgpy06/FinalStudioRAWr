import React, { memo, useEffect, useRef } from 'react';

/**
 * RGB Histogram overlay — computed from a canvas element.
 * Renders as a translucent overlay in the corner of the preview.
 */
const Histogram = memo(({ sourceCanvas, visible }) => {
    const histRef = useRef(null);

    useEffect(() => {
        if (!visible || !sourceCanvas || !histRef.current) return;

        const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
        const imgData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
        const data = imgData.data;

        // Build histogram bins
        const rBins = new Uint32Array(256);
        const gBins = new Uint32Array(256);
        const bBins = new Uint32Array(256);
        const lBins = new Uint32Array(256);

        for (let i = 0; i < data.length; i += 16) { // sample every 4th pixel for speed
            const r = data[i], g = data[i + 1], b = data[i + 2];
            rBins[r]++;
            gBins[g]++;
            bBins[b]++;
            lBins[Math.round(0.299 * r + 0.587 * g + 0.114 * b)]++;
        }

        // Find max for normalization
        let max = 1;
        for (let i = 2; i < 254; i++) { // skip extremes
            max = Math.max(max, rBins[i], gBins[i], bBins[i], lBins[i]);
        }

        // Draw
        const canvas = histRef.current;
        const w = 200, h = 80;
        canvas.width = w;
        canvas.height = h;
        const hctx = canvas.getContext('2d');
        hctx.clearRect(0, 0, w, h);

        const drawChannel = (bins, color) => {
            hctx.beginPath();
            hctx.moveTo(0, h);
            for (let i = 0; i < 256; i++) {
                const x = (i / 255) * w;
                const y = h - (Math.log1p(bins[i]) / Math.log1p(max)) * h;
                hctx.lineTo(x, y);
            }
            hctx.lineTo(w, h);
            hctx.closePath();
            hctx.fillStyle = color;
            hctx.fill();
        };

        drawChannel(lBins, 'rgba(255,255,255,0.15)');
        drawChannel(rBins, 'rgba(239,68,68,0.3)');
        drawChannel(gBins, 'rgba(34,197,94,0.3)');
        drawChannel(bBins, 'rgba(59,130,246,0.3)');
    }, [sourceCanvas, visible]);

    if (!visible) return null;

    return (
        <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-md rounded-lg border border-white/10 p-1.5 shadow-xl">
                <canvas ref={histRef} style={{ width: 200, height: 80 }} className="rounded" />
                <div className="flex justify-between px-1 mt-0.5">
                    <span className="text-[6px] font-bold text-zinc-500">0</span>
                    <span className="text-[6px] font-bold text-zinc-600 uppercase tracking-widest">Histogram</span>
                    <span className="text-[6px] font-bold text-zinc-500">255</span>
                </div>
            </div>
        </div>
    );
});

export default Histogram;
