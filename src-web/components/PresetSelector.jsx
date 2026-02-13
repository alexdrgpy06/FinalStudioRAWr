export default function PresetSelector({ presets, selectedId, onChange }) {
    return (
        <div className="preset-grid">
            {presets.map(p => (
                <div
                    key={p.id}
                    className={`preset-card ${selectedId === p.id ? 'active' : ''}`}
                    onClick={() => onChange(p.id)}
                >
                    {p.isUser && <span className="user-badge" />}
                    <div className="preset-name">{p.name}</div>
                    {p.description && (
                        <div className="preset-desc">{p.description}</div>
                    )}
                </div>
            ))}
        </div>
    );
}
