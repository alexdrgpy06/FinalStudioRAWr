import React, { useCallback } from 'react';
import { Sliders, Palette, Zap, Layers, ChevronRight, Upload, Play, FolderOpen, Loader2, ImageIcon } from 'lucide-react';
import { useStudioStore } from '../store';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

const ControlSlider = ({ label, value, min, max, step, onChange, unit = "" }) => (
    <div className="group space-y-2 mb-5">
      <div className="flex justify-between items-center px-1">
        <span className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.15em] group-hover:text-zinc-300 transition-colors">{label}</span>
        <span className="text-blue-400 font-mono text-[10px] font-bold bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-[3px] bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:bg-zinc-700 transition-all"
      />
    </div>
);

const SidebarHeader = ({ icon: Icon, title }) => (
    <div className="flex items-center gap-2 mb-6 mt-2 opacity-50">
        <Icon size={12} className="text-blue-500" />
        <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{title}</h2>
    </div>
);

const PRESETS = [
    { name: 'Cinematic', options: { exposure: 0.1, contrast: 1.2, saturation: 1.1, vibrance: 0.2, shadows: -0.1, highlights: -0.2 } },
    { name: 'B&W High', options: { exposure: 0.0, contrast: 1.3, saturation: 0, vibrance: 0, shadows: -0.2, highlights: 0.1 } },
    { name: 'Vintage', options: { exposure: 0.05, contrast: 1.1, saturation: 0.8, vibrance: 0.1, shadows: 0.1, highlights: -0.1 } },
    { name: 'Soft', options: { exposure: 0.1, contrast: 0.9, saturation: 0.9, vibrance: 0.0, clarity: -0.2 } },
    { name: 'Punchy', options: { exposure: 0.0, contrast: 1.25, saturation: 1.2, vibrance: 0.3, highlights: 0.1, shadows: -0.1 } },
];

export const Sidebar = () => {
    const store = useStudioStore();
    const isTauri = window.__TAURI__ !== undefined;

    const selectOutputDir = async () => {
        if (isTauri) {
            const selected = await open({
                directory: true,
                multiple: false,
            });
            if (selected) store.setOutputDir(selected);
        }
    };

    const runBatch = async () => {
        let outDir = store.outputDir;
        if (store.engine === 'native' && isTauri && !outDir) {
            store.addToast("Please select an output directory first.", 'error');
            await selectOutputDir();
            // Re-fetch from store directly or use the promise result if I had it, but store updates are async-ish in React?
            // Zustand updates are synchronous.
            outDir = useStudioStore.getState().outputDir;
            if (!outDir) return;
        }

        store.setProcessing(true);
        if (store.engine === 'native' && isTauri) {
            try {
                const filesToProcess = store.files.map(f => [f.path, `${outDir}/final_${f.name}.jpg`]);
                await invoke('process_bulk', { files: filesToProcess, options: store.options });
            } catch (e) {
                store.addToast(`Batch failed: ${e}`, 'error');
            }
        } else {
            // Web Batch Emulation
            for (let i=0; i<=100; i+=5) {
                store.setProgress(i);
                store.setStage('Web Exporting...');
                await new Promise(r => setTimeout(r, 100));
            }
        }
        store.setProcessing(false);
        store.setStage('Batch Complete');
        store.addToast("Batch processing completed!", 'success');
    };

    return (
        <aside className="w-[340px] border-r border-zinc-900 bg-[#08080A] flex flex-col shadow-2xl z-20">
            {/* ... Header ... */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-10 custom-scrollbar">
                <section>
                    <SidebarHeader icon={Layers} title="Quick Presets" />
                    <div className="grid grid-cols-2 gap-2">
                        {PRESETS.map(preset => (
                            <button
                                key={preset.name}
                                onClick={() => store.setOptions(preset.options)}
                                className="py-3 px-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[9px] font-black uppercase hover:bg-zinc-800 hover:border-zinc-700 hover:text-blue-400 transition-all text-zinc-500"
                            >
                                {preset.name}
                            </button>
                        ))}
                    </div>
                </section>

                <section>
                    <SidebarHeader icon={Sliders} title="Develop Engine" />
                    <ControlSlider label="Exposure" value={store.options.exposure} min={-4} max={4} step={0.01} onChange={(v) => store.setOptions({ exposure: v })} />
                    <ControlSlider label="Contrast" value={store.options.contrast} min={0} max={2} step={0.01} onChange={(v) => store.setOptions({ contrast: v })} />
                    <ControlSlider label="Highlights" value={store.options.highlights} min={-1} max={1} step={0.01} onChange={(v) => store.setOptions({ highlights: v })} />
                    <ControlSlider label="Shadows" value={store.options.shadows} min={-1} max={1} step={0.01} onChange={(v) => store.setOptions({ shadows: v })} />
                </section>

                <section>
                    <SidebarHeader icon={Palette} title="Color & Grading" />
                    <ControlSlider label="Vibrance" value={store.options.vibrance} min={-1} max={1} step={0.01} onChange={(v) => store.setOptions({ vibrance: v })} />
                    <ControlSlider label="Saturation" value={store.options.saturation} min={0} max={2} step={0.01} onChange={(v) => store.setOptions({ saturation: v })} />
                </section>

                <section>
                    <SidebarHeader icon={Zap} title="Branding" />
                     <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="TEXT WATERMARK"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-[10px] font-bold focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700"
                            value={store.options.watermark_text}
                            onChange={(e) => store.setOptions({ watermark_text: e.target.value })}
                        />
                        <button className="w-full py-4 px-5 bg-zinc-950 border border-zinc-800 rounded-xl text-[10px] font-black flex items-center justify-between group hover:border-blue-500/40 transition-all">
                        <span className="flex items-center gap-3"><ImageIcon size={14} className="text-zinc-500 group-hover:text-blue-500" /> SELECT LOGO (PNG)</span>
                        <Upload size={12} className="text-zinc-700" />
                        </button>
                    </div>
                </section>
            </div>

            <div className="p-8 border-t border-zinc-900/50 bg-[#08080A] space-y-4">
                <button
                    onClick={selectOutputDir}
                    className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                >
                    <FolderOpen size={12} /> {store.outputDir ? 'CHANGE OUTPUT' : 'SELECT OUTPUT'}
                </button>

                <button
                    disabled={store.processing || store.files.length === 0}
                    onClick={runBatch}
                    className="group w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-20 disabled:grayscale rounded-3xl text-xs font-black text-white shadow-2xl shadow-blue-900/40 transition-all flex items-center justify-center gap-3"
                >
                    {store.processing ? <Loader2 className="animate-spin" size={18} /> : (
                        <><Play size={14} fill="white" /> EXECUTE BATCH</>
                    )}
                </button>
            </div>
        </aside>
    );
}
