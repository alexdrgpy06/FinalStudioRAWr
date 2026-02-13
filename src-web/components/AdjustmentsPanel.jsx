export default function AdjustmentsPanel({ overrides, presetAdjustments, onChange }) {
    const getVal = (key, def) =>
        overrides[key] !== undefined ? overrides[key]
            : presetAdjustments[key] !== undefined ? presetAdjustments[key]
                : def;

    const set = (key, val) => onChange({ ...overrides, [key]: val });

    const fmt = (val) => val > 0 ? `+${val}` : `${val}`;
    const fmtF = (val) => val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1);

    return (
        <div className="adjustments-panel">
            <Slider label="Temperatura" value={getVal('wb_temp', 0)} min={-100} max={100}
                onChange={v => set('wb_temp', v)} format={fmt} />
            <Slider label="Tinción" value={getVal('wb_tint', 0)} min={-50} max={50}
                onChange={v => set('wb_tint', v)} format={fmt} />
            <Slider label="Saturación" value={getVal('sat', 100)} min={0} max={200}
                onChange={v => set('sat', v)} format={v => `${v}%`} />

            <div className="divider" />

            <Slider label="Exposición" value={getVal('exposure', 0)} min={-2} max={2} step={0.1}
                onChange={v => set('exposure', v)} format={fmtF} />
            <Slider label="Contraste" value={getVal('contrast', 0)} min={-100} max={100}
                onChange={v => set('contrast', v)} format={fmt} />
            <Slider label="Resaltados" value={getVal('highlights', 0)} min={-100} max={100}
                onChange={v => set('highlights', v)} format={fmt} />
            <Slider label="Sombras" value={getVal('shadows', 0)} min={-100} max={100}
                onChange={v => set('shadows', v)} format={fmt} />
            <Slider label="Blancos" value={getVal('whites', 0)} min={-100} max={100}
                onChange={v => set('whites', v)} format={fmt} />
            <Slider label="Negros" value={getVal('blacks', 0)} min={-100} max={100}
                onChange={v => set('blacks', v)} format={fmt} />
        </div>
    );
}

function Slider({ label, value, min, max, step = 1, onChange, format }) {
    return (
        <div className="control-group" style={{ marginBottom: 12 }}>
            <div className="control-header">
                <span className="label">{label}</span>
                <span className="value">{format(value)}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
            />
        </div>
    );
}
