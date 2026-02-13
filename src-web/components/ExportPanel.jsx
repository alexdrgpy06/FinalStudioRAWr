export default function ExportPanel({ results = {}, onDownloadSingle, onDownloadAll }) {
    const entries = Object.entries(results).filter(([, v]) => v);
    const count = entries.length;

    if (count === 0) return null;

    return (
        <div style={{ marginTop: 16 }}>
            <div className="control-header">
                <span className="label">Exportar ({count})</span>
                {count > 1 && (
                    <button className="btn btn-secondary" style={{ fontSize: 10, padding: '2px 8px', height: 24 }} onClick={onDownloadAll}>
                        TODO (.zip)
                    </button>
                )}
            </div>

            <div className="file-list">
                {entries.map(([name, blob]) => (
                    <div key={name} className="file-item" style={{ cursor: 'default' }}>
                        <div className="file-info">
                            <span className="file-name">{name}</span>
                        </div>
                        <button className="btn-icon" onClick={() => onDownloadSingle(name, blob)} title="Descargar">
                            ⬇️
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
