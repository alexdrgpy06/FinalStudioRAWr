import React, { useState } from 'react';
import {
    Sliders, Palette, Film, Zap, FileImage,
    Image as ImageIcon, Upload, CheckCircle2, X, Download, Play, Loader2,
    Sparkles, ChevronDown, ChevronRight
} from 'lucide-react';
import { useStudioStore } from '../store/store';

// ─── Shared small components ─────────────────────────────
const Slider = ({ label, value, min, max, step, onChange, unit = "" }) => (
    <div className="group space-y-1 mb-2.5">
        <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold uppercase text-zinc-500 tracking-wider group-hover:text-zinc-300 transition-colors">{label}</span>
            <span className="text-blue-400 font-mono text-[10px] font-bold bg-blue-500/5 px-1.5 py-px rounded border border-blue-500/10">
                {typeof value === 'number' ? (Number.isInteger(step) ? value : value.toFixed(2)) : value}{unit}
            </span>
        </div>
        <input type="range" min={min} max={max} step={step} value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full accent-blue-500" />
    </div>
);

const Section = ({ icon: Icon, title, children, collapsible = false, defaultOpen = true }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <section className="border-b border-zinc-900/40 pb-3 last:border-b-0">
            <button
                onClick={collapsible ? () => setOpen(!open) : undefined}
                className={`flex items-center gap-2 mb-2.5 w-full text-left ${collapsible ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
            >
                <Icon size={11} className="text-blue-500 shrink-0" />
                <h2 className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.15em] flex-1">{title}</h2>
                {collapsible && (open ? <ChevronDown size={10} className="text-zinc-600" /> : <ChevronRight size={10} className="text-zinc-600" />)}
            </button>
            {(!collapsible || open) && children}
        </section>
    );
};

const POSITIONS = [
    { id: 'top-left', label: 'TL' }, { id: 'top-right', label: 'TR' },
    { id: 'center', label: 'C' },
    { id: 'bottom-left', label: 'BL' }, { id: 'bottom-right', label: 'BR' },
];

const PosPicker = ({ value, onChange }) => (
    <div className="grid grid-cols-5 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-900 mb-2">
        {POSITIONS.map(p => (
            <button key={p.id} onClick={() => onChange(p.id)}
                className={`text-[8px] font-bold py-1 rounded transition-all ${value === p.id ? 'bg-blue-600 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>{p.label}</button>
        ))}
    </div>
);

const OUTPUT_SIZES = [
    { value: 0, label: 'Original' }, { value: 4000, label: '4K' },
    { value: 3000, label: '3K' }, { value: 2000, label: '2K' }, { value: 1200, label: '1.2K' },
];

const QUICK_PRESETS = [
    { name: 'Default', icon: '○', options: { exposure: 0, contrast: 1.0, saturation: 1.0, vibrance: 0, shadows: 0, highlights: 0, clarity: 0, temperature: 0, tint: 0, whites: 0, blacks: 0, vignette: 0, grain: 0, sharpening: 0 } },
    { name: 'Cinema', icon: '🎬', options: { exposure: 0.1, contrast: 1.2, saturation: 1.1, vibrance: 0.2, shadows: -0.1, highlights: -0.2, vignette: 0.15 } },
    { name: 'B&W', icon: '◐', options: { exposure: 0.0, contrast: 1.3, saturation: 0, vibrance: 0, shadows: -0.2, highlights: 0.1 } },
    { name: 'Vintage', icon: '📷', options: { exposure: 0.05, contrast: 1.1, saturation: 0.8, vibrance: 0.1, shadows: 0.1, highlights: -0.1, grain: 0.1 } },
    { name: 'Soft', icon: '☁️', options: { exposure: 0.1, contrast: 0.9, saturation: 0.9, vibrance: 0.0, clarity: -0.2 } },
    { name: 'Punchy', icon: '⚡', options: { exposure: 0.0, contrast: 1.25, saturation: 1.2, vibrance: 0.3, highlights: 0.1, shadows: -0.1, sharpening: 0.5 } },
    { name: 'Warm', icon: '☀️', options: { exposure: 0.15, contrast: 1.05, saturation: 1.15, vibrance: 0.15, temperature: 30 } },
    { name: 'Cool', icon: '❄️', options: { exposure: -0.05, contrast: 1.15, saturation: 0.85, vibrance: 0.1, temperature: -30 } },
];

export default function Sidebar({
    visible,
    onClose,
    hasActiveFile,
    onImportLogo,
    onImportLUT,
    onExportCurrent,
    onRunBatch,
}) {
    const store = useStudioStore();
    const o = store.options;

    return (
        <>
            {visible && <div className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden" onClick={onClose} />}
            <aside className={`
        fixed top-0 bottom-0 left-0 w-[280px] sm:w-[300px] lg:w-[280px]
        lg:relative lg:translate-x-0 z-40 
        border-r border-zinc-800/50 bg-[#0A0A0C]
        flex flex-col transition-transform duration-200 ease-out
        ${visible ? 'translate-x-0' : '-translate-x-full'}
      `}>

                {/* Title bar */}
                <div className="h-12 px-4 border-b border-zinc-800/50 flex items-center justify-between shrink-0">
                    <h1 className="text-sm font-black tracking-tight text-white">STUDIO <span className="text-blue-500">RAWr</span></h1>
                    <button className="lg:hidden text-zinc-500 hover:text-white p-1.5 -mr-1 rounded-lg hover:bg-zinc-800 transition-all active:scale-90" onClick={onClose}><X size={18} /></button>
                </div>

                {/* Scrollable controls */}
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 custom-scrollbar overscroll-contain">

                    {/* Quick Presets — single unified section */}
                    <Section icon={Sparkles} title="Presets">
                        <div className="grid grid-cols-4 gap-1.5">
                            {QUICK_PRESETS.map(p => (
                                <button key={p.name} onClick={() => store.setOptions(p.options)}
                                    className="py-2 px-1 bg-zinc-900/80 border border-zinc-800/60 rounded-lg text-center hover:bg-zinc-800 hover:border-blue-500/30 hover:text-blue-400 transition-all text-zinc-500 group active:scale-95">
                                    <span className="block text-sm leading-none mb-0.5 group-hover:scale-110 transition-transform">{p.icon}</span>
                                    <span className="block text-[7px] font-black uppercase tracking-wide truncate">{p.name}</span>
                                </button>
                            ))}
                        </div>
                    </Section>

                    {/* Develop */}
                    <Section icon={Sliders} title="Light" collapsible>
                        <Slider label="Exposure" value={o.exposure} min={-4} max={4} step={0.05} onChange={v => store.setOptions({ exposure: v })} />
                        <Slider label="Contrast" value={o.contrast} min={0} max={2} step={0.02} onChange={v => store.setOptions({ contrast: v })} />
                        <Slider label="Highlights" value={o.highlights} min={-1} max={1} step={0.02} onChange={v => store.setOptions({ highlights: v })} />
                        <Slider label="Shadows" value={o.shadows} min={-1} max={1} step={0.02} onChange={v => store.setOptions({ shadows: v })} />
                        <Slider label="Whites" value={o.whites} min={-1} max={1} step={0.02} onChange={v => store.setOptions({ whites: v })} />
                        <Slider label="Blacks" value={o.blacks} min={-1} max={1} step={0.02} onChange={v => store.setOptions({ blacks: v })} />
                        <Slider label="Clarity" value={o.clarity} min={-1} max={1} step={0.02} onChange={v => store.setOptions({ clarity: v })} />
                    </Section>

                    {/* Color */}
                    <Section icon={Palette} title="Color" collapsible>
                        <Slider label="Temperature" value={o.temperature} min={-100} max={100} step={1} onChange={v => store.setOptions({ temperature: v })} />
                        <Slider label="Tint" value={o.tint} min={-100} max={100} step={1} onChange={v => store.setOptions({ tint: v })} />
                        <Slider label="Vibrance" value={o.vibrance} min={-1} max={1} step={0.02} onChange={v => store.setOptions({ vibrance: v })} />
                        <Slider label="Saturation" value={o.saturation} min={0} max={2} step={0.02} onChange={v => store.setOptions({ saturation: v })} />
                    </Section>

                    {/* Effects */}
                    <Section icon={Sparkles} title="Effects" collapsible defaultOpen={false}>
                        <Slider label="Vignette" value={o.vignette} min={0} max={1} step={0.02} onChange={v => store.setOptions({ vignette: v })} />
                        <Slider label="Grain" value={o.grain} min={0} max={0.5} step={0.01} onChange={v => store.setOptions({ grain: v })} />
                        <Slider label="Sharpening" value={o.sharpening} min={0} max={2} step={0.05} onChange={v => store.setOptions({ sharpening: v })} />
                    </Section>

                    {/* LUT */}
                    <Section icon={Film} title="LUT" collapsible defaultOpen={false}>
                        <button onClick={onImportLUT} className={`w-full py-2.5 px-3 border rounded-xl text-[9px] font-black flex items-center justify-between transition-all active:scale-[0.98] ${o.lut ? 'bg-purple-500/10 border-purple-500/40 text-purple-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-purple-500/30'}`}>
                            <span className="flex items-center gap-2 truncate"><Film size={12} /> {o.lut || 'Import HaldCLUT'}</span>
                            {o.lut ? <CheckCircle2 size={10} /> : <Upload size={10} />}
                        </button>
                        {o.lut && <button onClick={() => store.setOptions({ lut: null, lutImageData: null })} className="w-full py-1 text-[7px] font-black text-red-500/50 hover:text-red-500 uppercase tracking-widest mt-1">Remove</button>}
                    </Section>

                    {/* Watermark */}
                    <Section icon={Zap} title="Watermark" collapsible defaultOpen={false}>
                        <input type="text" placeholder="Text overlay..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-[10px] font-bold focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700 mb-2"
                            value={o.watermark_text} onChange={(e) => store.setOptions({ watermark_text: e.target.value })} />
                        <PosPicker value={o.watermark_pos} onChange={v => store.setOptions({ watermark_pos: v })} />
                        <Slider label="Size" value={o.watermark_size} min={1} max={10} step={0.1} onChange={v => store.setOptions({ watermark_size: v })} unit="%" />
                    </Section>

                    {/* Logo */}
                    <Section icon={ImageIcon} title="Logo" collapsible defaultOpen={false}>
                        <button onClick={onImportLogo} className={`w-full py-2.5 px-3 border rounded-xl text-[9px] font-black flex items-center justify-between transition-all active:scale-[0.98] ${o.logo ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-blue-500/30'}`}>
                            <span className="flex items-center gap-2"><ImageIcon size={12} /> {o.logo ? 'Logo Loaded' : 'Upload PNG'}</span>
                            {o.logo ? <CheckCircle2 size={10} /> : <Upload size={10} />}
                        </button>
                        {o.logo && (
                            <div className="mt-2 space-y-1">
                                <PosPicker value={o.logo_pos} onChange={v => store.setOptions({ logo_pos: v })} />
                                <Slider label="Scale" value={o.logo_size} min={5} max={50} step={1} onChange={v => store.setOptions({ logo_size: v })} unit="%" />
                                <button onClick={() => store.setOptions({ logo: null })} className="w-full py-1 text-[7px] font-black text-red-500/50 hover:text-red-500 uppercase tracking-widest">Remove</button>
                            </div>
                        )}
                    </Section>

                    {/* Export Settings */}
                    <Section icon={FileImage} title="Export">
                        <div className="space-y-2">
                            <div className="grid grid-cols-5 gap-1">
                                {OUTPUT_SIZES.map(s => (
                                    <button key={s.value} onClick={() => store.setOptions({ outputSize: s.value })}
                                        className={`py-1.5 rounded-lg text-[7px] font-black uppercase transition-all active:scale-95 ${o.outputSize === s.value ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-zinc-900 text-zinc-600 border border-zinc-800/60 hover:border-zinc-700'}`}>{s.label}</button>
                                ))}
                            </div>
                            <div className="flex gap-1">
                                {['jpeg', 'png', 'webp'].map(f => (
                                    <button key={f} onClick={() => store.setOptions({ exportFormat: f })}
                                        className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all active:scale-95 ${o.exportFormat === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-zinc-900 text-zinc-600 border border-zinc-800/60 hover:border-zinc-700'}`}>{f}</button>
                                ))}
                            </div>
                            {(o.exportFormat === 'jpeg' || o.exportFormat === 'webp') && <Slider label="Quality" value={o.exportQuality} min={50} max={100} step={1} onChange={v => store.setOptions({ exportQuality: v })} unit="%" />}
                        </div>
                    </Section>
                </div>

                {/* Actions — sticky bottom */}
                <div className="p-3 border-t border-zinc-800/50 bg-[#0A0A0C] space-y-1.5 shrink-0">
                    <button disabled={!hasActiveFile || store.processing} onClick={onExportCurrent}
                        className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-20 rounded-xl text-[9px] font-black text-zinc-300 transition-all flex items-center justify-center gap-2 border border-zinc-700/50 active:scale-[0.98]">
                        <Download size={12} /> EXPORT CURRENT
                    </button>
                    <button disabled={store.processing || !store.files.length} onClick={onRunBatch}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-20 rounded-xl text-[10px] font-black text-white shadow-xl shadow-blue-900/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                        {store.processing ? <Loader2 className="animate-spin" size={14} /> : <><Play size={12} fill="white" /> BATCH ({store.files.length})</>}
                    </button>
                </div>
            </aside>
        </>
    );
}
