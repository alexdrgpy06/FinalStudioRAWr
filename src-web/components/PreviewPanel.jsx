import { useState, useRef, useEffect } from 'react';

export default function PreviewPanel({ originalUrl, previewUrl, loading }) {
    const [showOriginal, setShowOriginal] = useState(false);
    const [zoom, setZoom] = useState(1);
    const containerRef = useRef(null);

    const displayUrl = showOriginal ? originalUrl : (previewUrl || originalUrl);

    return (
        <div className="preview-panel" ref={containerRef}>
            {/* Header controls */}
            <div className="preview-controls">
                <h2 className="preview-title">Previa</h2>
                <div className="preview-actions">
                    {originalUrl && previewUrl && (
                        <button
                            className={`toggle-btn ${showOriginal ? 'active' : ''}`}
                            onClick={() => setShowOriginal(!showOriginal)}
                        >
                            {showOriginal ? '👁️ Original' : '👁️ Ver Original'}
                        </button>
                    )}
                    {previewUrl && (
                        <div className="zoom-controls">
                            <button
                                className="zoom-btn"
                                onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
                                title="Zoom out"
                            >−</button>
                            <span className="zoom-value">{Math.round(zoom * 100)}%</span>
                            <button
                                className="zoom-btn"
                                onClick={() => setZoom(z => Math.min(4, z + 0.25))}
                                title="Zoom in"
                            >+</button>
                            <button
                                className="zoom-btn"
                                onClick={() => setZoom(1)}
                                title="Reset"
                            >⟳</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Image area */}
            <div className="preview-viewport">
                {loading && <div className="spinner" />}

                {!displayUrl ? (
                    <div className="placeholder">
                        <div className="placeholder-icon">🖼️</div>
                        <p>Cargá una imagen para ver la previsualización en tiempo real</p>
                        <p className="placeholder-sub">Todo el procesamiento se ejecuta localmente en tu dispositivo</p>
                    </div>
                ) : (
                    <>
                        <img
                            src={displayUrl}
                            className="preview-img"
                            alt="Preview"
                            style={{
                                transform: `scale(${zoom})`,
                                opacity: loading && !showOriginal ? 0.5 : 1,
                            }}
                        />
                        {showOriginal && (
                            <div className="view-badge original">ORIGINAL</div>
                        )}
                        {!showOriginal && previewUrl && (
                            <div className="view-badge edited">EDITADO</div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
