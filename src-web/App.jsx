import { useEffect, useState, useCallback, useRef } from 'react';
import FileUpload from './components/FileUpload.jsx';
import ProcessingQueue from './components/ProcessingQueue.jsx';
import PreviewPanel from './components/PreviewPanel.jsx';
import AdjustmentsPanel from './components/AdjustmentsPanel.jsx';
import PresetSelector from './components/PresetSelector.jsx';
import ExportPanel from './components/ExportPanel.jsx';
import { initPresets, listPresets, getPreset, resolvePresetForRun, saveUserPreset } from './engine/preset-loader.js';
import { processFile, canvasToBlob, applyWatermark, applyTextWatermark } from './engine/image-engine.js';
import { isRawFile, decodeRawToCanvas } from './engine/raw-decoder.js';

// ─────────────────────────────────────────────────────────
// Debounce Hook
// ─────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────
export default function App() {
  // Preset state
  const [presets, setPresets] = useState([]);
  const [presetId, setPresetId] = useState('clasico_v1');
  const [presetAdjustments, setPresetAdjustments] = useState({});
  const [overrides, setOverrides] = useState({});

  // Effects
  const [noiseLevel, setNoiseLevel] = useState('none');
  const [vignetteLevel, setVignetteLevel] = useState('none');

  // Logo & Watermark
  const [logoFile, setLogoFile] = useState(null);
  const [logoImage, setLogoImage] = useState(null);
  const [logoPos, setLogoPos] = useState('bottom-right');
  const [logoScale, setLogoScale] = useState(18);
  const [watermark, setWatermark] = useState('');
  const [watermarkPos, setWatermarkPos] = useState('bottom-right');

  // Files
  const [files, setFiles] = useState([]);
  const [projectName, setProjectName] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [previewOriginalUrl, setPreviewOriginalUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Processing
  const [processing, setProcessing] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [progress, setProgress] = useState({});
  const [results, setResults] = useState({});

  // UI State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [fileErrors, setFileErrors] = useState({}); // Map of filename -> error message

  // Diagnostic
  useEffect(() => {
    import('./engine/libraw-diagnostic.js').then(({ testLibRaw }) => {
      testLibRaw().then(status => {
        if (status !== "OK") {
          alert(`Error crítico: No se pudo iniciar el motor RAW.\n${status}\n\nVerifica que 'libraw.wasm' se esté cargando correctamente.`);
        }
      });
    });
  }, []);

  // Debounced values
  const debouncedOverrides = useDebounce(overrides, 300);
  const debouncedNoise = useDebounce(noiseLevel, 400);
  const debouncedVignette = useDebounce(vignetteLevel, 400);
  const debouncedPresetId = useDebounce(presetId, 200);

  // Preset loading
  useEffect(() => {
    initPresets().then(() => {
      setPresets(listPresets());
    });
  }, []);

  // Sync preset adjustments
  useEffect(() => {
    try {
      const p = getPreset(presetId);
      setPresetAdjustments(p.adjustments || {});
    } catch { /* ignore */ }
  }, [presetId, presets]);

  // ─────────────────────── Preview logic (Worker) ───────────────────────

  const workerRef = useRef(null);

  useEffect(() => {
    // Initialize worker
    workerRef.current = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

    workerRef.current.onmessage = (e) => {
      const { success, imageData, error, isPreview } = e.data;
      if (success) {
        // Create bitmap from received ImageData to display on canvas
        createImageBitmap(imageData).then(bitmap => {
          const canvas = document.createElement('canvas');
          canvas.width = imageData.width;
          canvas.height = imageData.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(bitmap, 0, 0);

          canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            setLoadingPreview(false);
          }, 'image/jpeg', 0.90);
        });
      } else {
        console.error('Worker processing failed:', error);
        alert(`Error procesando imagen: ${error}`);
        setLoadingPreview(false);
      }
    };

    return () => workerRef.current?.terminate();
  }, []);

  const generatePreview = useCallback(async () => {
    if (!previewFile) return;
    setLoadingPreview(true);

    const { basePreset, creativePreset } = resolvePresetForRun(presetId);
    const allOverrides = {
      ...overrides,
      noise_level: noiseLevel,
      vignette_level: vignetteLevel,
      logo_image: logoImage, // Note: Cannot pass DOM elements to worker. Need scaling approach.
      logo_pos: logoPos,
      logo_scale: logoScale,
      watermark_text: watermark,
      watermark_pos: watermarkPos,
    };

    // For non-RAW files, we might need to send ImageData if we want worker to handle it
    // Or just let main thread handle simple JPGs if they are small.
    // For consistency, let's try to send everything to worker.

    // Simplification for MVP v2.1:
    // Pass File object directly if RAW. 
    // If standard image, we need to decode it first in main thread then send buffer.

    let message = {
      type: 'process',
      basePreset,
      creativePreset,
      overrides: allOverrides,
      assets: {},
      previewMode: true,
      targetWidth: 1920
    };

    if (isRawFile(previewFile.name)) {
      message.file = previewFile;
      // console.log("Sending RAW to worker:", previewFile.name);
    } else {
      // Decode standard image to ImageData first
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        message.imageData = ctx.getImageData(0, 0, img.width, img.height);
        workerRef.current.postMessage(message, [message.imageData.data.buffer]);
      };
      img.src = URL.createObjectURL(previewFile);
      return; // Async handled by onload
    }

    workerRef.current.postMessage(message);

  }, [previewFile, presetId, overrides, noiseLevel, vignetteLevel, logoImage, logoPos, logoScale, watermark, watermarkPos]);


  useEffect(() => {
    if (!previewFile) return;
    // Clear error for this file when trying to regenerate
    setFileErrors(prev => ({ ...prev, [previewFile.name]: null }));
    generatePreview();
  }, [previewFile, debouncedPresetId, debouncedOverrides, debouncedNoise, debouncedVignette, logoImage, logoPos, logoScale, watermark, watermarkPos]);

  // ─────────────────────── File handling ───────────────────────

  const handleFilesSelected = useCallback(async (newFiles) => {
    setFiles(prev => [...prev, ...newFiles]);
    if (!previewFile && newFiles.length > 0) {
      const file = newFiles[0];
      setPreviewFile(file);
      if (isRawFile(file.name)) {
        try {
          // OPTIMIZATION: Use embedded JPEG preview for instant feedback
          // This is 10-50x faster than full RAW decode
          const { extractRawPreview, decodeRawToCanvas } = await import('./engine/raw-decoder.js');

          let previewData = await extractRawPreview(file);

          if (previewData) {
            // We have an embedded preview!
            const canvas = document.createElement('canvas');
            canvas.width = previewData.width;
            canvas.height = previewData.height;
            const ctx = canvas.getContext('2d');
            ctx.putImageData(previewData.imageData, 0, 0);

            canvas.toBlob(blob => {
              setPreviewOriginalUrl(URL.createObjectURL(blob));
            }, 'image/jpeg', 0.90);
          } else {
            console.warn("No embedded preview found, falling back to full decode (slower)");
            const canvas = await decodeRawToCanvas(file);
            const blob = await canvasToBlob(canvas);
            setPreviewOriginalUrl(URL.createObjectURL(blob));
          }
        } catch (e) {
          console.error('RAW decode failed for preview:', e);
          setFileErrors(prev => ({ ...prev, [file.name]: `Error al abrir RAW: ${e.message}` }));
          alert(`No se pudo abrir el archivo RAW: ${f.name}\n${e.message}`);
        }
      } else {
        setPreviewOriginalUrl(URL.createObjectURL(file));
      }
    }
  }, [previewFile]);

  // ─────────────────────── Logo upload ───────────────────────

  const handleLogoUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const img = new Image();
    img.onload = () => setLogoImage(img);
    img.src = URL.createObjectURL(file);
  }, []);

  // ─────────────────────── Batch Process (Worker) ───────────────────────

  const processAll = useCallback(async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress({});
    setResults({});

    const { basePreset, creativePreset } = resolvePresetForRun(presetId);
    const allOverrides = {
      ...overrides,
      noise_level: noiseLevel,
      vignette_level: vignetteLevel,
      logo_image: null, // Worker cannot handle DOM images
      logo_pos: logoPos,
      logo_scale: logoScale,
      watermark_text: watermark,
      watermark_pos: watermarkPos,
    };

    // For batch in MVP v2.1, we process serially in the worker to avoid spawning too many
    // or just one by one.
    // Ideally we'd use a pool, but one worker is better than main thread blocking.

    // We need a way to send one by one and wait.
    // Currently the worker `onmessage` handles one result. We need to correlate requests.
    // For MVP, let's keep it simple: we won't use the same worker instance for batch if we want to track IDs,
    // OR we just attach an ID to the message.

    // Refactor worker to return ID?
    // Let's just create a temporary dedicated worker for batch to keep logic simple and clean? 
    // Or reuse the existing one with a Promise queue?

    // Parallel Worker Pool
    const concurrency = navigator.hardwareConcurrency ? Math.max(2, navigator.hardwareConcurrency - 1) : 4;
    const pool = [];
    const activeWorkers = [];

    // Initialize pool
    for (let i = 0; i < concurrency; i++) {
      const w = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      pool.push(w);
      activeWorkers.push(w); // Keep track to terminate later
    }

    const fileQueue = [...files];
    let completed = 0;
    let cancelled = false;

    // Cancellation handler (exposed via ref or state if needed, for MVP we just use a flag variable check in loop)
    // To implement real cancellation UI, we'd need a ref/state. For now, we'll respect if component unmounts or processing set to false?
    // Actually, let's just run until queue empty.

    try {
      const processNext = async (worker) => {
        if (fileQueue.length === 0 || cancelled) return;

        const file = fileQueue.shift();
        // Initial progress
        setProgress(prev => ({ ...prev, [file.name]: 10 }));

        return new Promise((resolve, reject) => {
          worker.onmessage = (e) => {
            const { success, imageData, error } = e.data;
            if (success) {
              createImageBitmap(imageData).then(bitmap => {
                const canvas = document.createElement('canvas');
                canvas.width = imageData.width;
                canvas.height = imageData.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(bitmap, 0, 0);

                // Apply watermarks (Main Thread)
                const currentOverrides = allOverrides; // Closure capture
                if (currentOverrides.logo_image && currentOverrides.logo_image instanceof HTMLImageElement) {
                  applyWatermark(canvas, currentOverrides.logo_image, currentOverrides.logo_pos, 0.8, (currentOverrides.logo_scale || 20) / 100);
                }
                if (currentOverrides.watermark_text) {
                  applyTextWatermark(canvas, currentOverrides.watermark_text, 'bottom-right');
                }

                canvas.toBlob(blob => {
                  resolve({ file, blob });
                }, 'image/jpeg', 0.92);
              });
            } else {
              reject(new Error(error));
            }
          };

          worker.onerror = (err) => reject(err);

          let msg = {
            type: 'process',
            basePreset,
            creativePreset,
            overrides: allOverrides,
            assets: {},
            previewMode: false
          };

          if (isRawFile(file.name)) {
            msg.file = file;
            worker.postMessage(msg);
          } else {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);


              msg.imageData = ctx.getImageData(0, 0, img.width, img.height);
              worker.postMessage(msg, [msg.imageData.data.buffer]);
            };
            img.src = URL.createObjectURL(file);
          }
        })
          .then(({ file, blob }) => {
            setResults(prev => ({ ...prev, [file.name]: blob }));
            setProgress(prev => ({ ...prev, [file.name]: 100 }));
          })
          .catch(err => {
            console.error(`Failed ${file.name}:`, err);
            // alert(`Falló ${file.name}: ${err.message}`); // Too intrusive for batch
            setProgress(prev => ({ ...prev, [file.name]: -1 }));
          })
          .finally(() => {
            // Determine if we should continue
            // If context/state says stop, set cancelled = true? 
            // For now, just recursive call
            return processNext(worker);
          });
      };

      // Start all workers
      await Promise.all(pool.map(w => processNext(w)));

    } finally {
      activeWorkers.forEach(w => w.terminate());
      setProcessing(false);
    }

  }, [files, presetId, overrides, noiseLevel, vignetteLevel, logoPos, logoScale, watermark, watermarkPos]);

  // ─────────────────────── Download ───────────────────────

  const downloadSingle = useCallback((name, blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const baseName = name.replace(/\.[^.]+$/, '');
    const prefix = projectName.trim() ? projectName.trim() : 'AutoStudio';
    a.href = url;
    a.download = `${prefix}_${baseName}.jpg`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const downloadAll = useCallback(async () => {
    for (const [name, blob] of Object.entries(results)) {
      if (blob) downloadSingle(name, blob);
    }
  }, [results, downloadSingle]);

  // ─────────────────────── Save Preset ───────────────────────

  const handleSavePreset = useCallback(async () => {
    if (!newPresetName.trim()) return;
    const slug = newPresetName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const id = `user_${slug}_v1`;
    try {
      const newPreset = {
        id,
        name: newPresetName.trim(),
        type: 'link',
        creative: presetId,
        adjustments: { ...overrides },
        pipeline: [],
      };
      await saveUserPreset(newPreset);
      setPresets(listPresets());
      setPresetId(id);
      setShowSaveModal(false);
      setNewPresetName('');
    } catch (e) {
      console.error('Save preset failed:', e);
    }
  }, [newPresetName, presetId, overrides]);

  // ─────────────────────── Render ───────────────────────

  return (
    <div className="app-layout">
      {/* HEADER */}
      <header className="app-header">
        <div className="brand">
          <span>AutoStudio</span>
        </div>

        <div className="header-actions">
          {/* Project Name - Simplified */}
          <input
            className="inp"
            placeholder="Proyecto..."
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            style={{ width: 140, background: 'transparent', border: 'none', textAlign: 'right', color: 'var(--text-secondary)' }}
          />
        </div>
      </header>

      {/* LEFT PANEL: Library */}
      <div className="panel panel-left">
        <div className="panel-header">Biblioteca</div>
        <div className="panel-content">
          <div>
            <div className="control-header">
              <span className="label">Archivos ({files.length})</span>
              <FileUpload onFilesSelected={handleFilesSelected} mode="button" disabled={processing} />
            </div>

            {files.length === 0 && (
              <div className="empty-state" onClick={() => document.querySelector('input[type=file]').click()}>
                Arrastra RAW/JPG aquí
              </div>
            )}

            <div className="file-list">
              {files.map((f, i) => (
                <div
                  key={i}
                  className={`file-item ${previewFile === f ? 'selected' : ''}`}
                  onClick={async () => {
                    setPreviewFile(f);
                    if (isRawFile(f.name)) {
                      const { extractRawPreview, decodeRawToCanvas } = await import('./engine/raw-decoder.js');
                      try {
                        const previewData = await extractRawPreview(f);
                        if (previewData) {
                          const canvas = document.createElement('canvas');
                          canvas.width = previewData.width;
                          canvas.height = previewData.height;
                          const ctx = canvas.getContext('2d');
                          ctx.putImageData(previewData.imageData, 0, 0);
                          canvas.toBlob(blob => setPreviewOriginalUrl(URL.createObjectURL(blob)));
                        } else {
                          const canvas = await decodeRawToCanvas(f);
                          canvasToBlob(canvas).then(blob => setPreviewOriginalUrl(URL.createObjectURL(blob)));
                        }
                      } catch (e) { console.error(e); }
                    } else {
                      setPreviewOriginalUrl(URL.createObjectURL(f));
                    }
                  }}
                >
                  <div className="file-info">
                    <div className="file-name">{f.name}</div>
                  </div>
                  {progress[f.name] && progress[f.name] < 100 && progress[f.name] > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--accent-blue)' }}>{progress[f.name]}%</span>
                  )}
                  {results[f.name] && (
                    <span style={{ fontSize: 10, color: 'var(--text-primary)' }}>✓</span>
                  )}
                  {fileErrors[f.name] && (
                    <span style={{ fontSize: 10, color: 'var(--accent-danger)' }} title={fileErrors[f.name]}>⚠️</span>
                  )}
                  <button className="btn-icon-small" onClick={(e) => {
                    e.stopPropagation();
                    setFiles(prev => prev.filter((_, j) => j !== i));
                    if (previewFile === f) {
                      setPreviewFile(null);
                      setPreviewOriginalUrl(null);
                      setPreviewUrl(null);
                    }
                  }}>×</button>
                </div>
              ))}
            </div>
          </div>

          <div className="divider" />

          <div>
            <div className="control-header">
              <span className="label">Presets</span>
            </div>
            <PresetSelector
              presets={presets}
              selectedId={presetId}
              onChange={(id) => {
                setPresetId(id);
                setOverrides({});
              }}
            />
          </div>
        </div>
      </div>

      {/* CENTER PANEL: Canvas */}
      <div className="panel panel-center">
        <div className="preview-area">
          <PreviewPanel
            originalUrl={previewOriginalUrl}
            previewUrl={previewUrl}
            loading={loadingPreview}
          />
        </div>
      </div>

      {/* RIGHT PANEL: Tools */}
      <div className="panel panel-right">
        <div className="panel-header">Ajustes</div>
        <div className="panel-content">

          {/* Adjustments */}
          <AdjustmentsPanel
            overrides={overrides}
            presetAdjustments={presetAdjustments}
            onChange={setOverrides}
          />

          <div className="divider" />

          {/* Effects */}
          <div className="control-group">
            <div className="control-header"><span className="label">Efectos</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label" style={{ marginBottom: 4, display: 'block' }}>Ruido</label>
                <select className="inp" style={{ width: '100%' }} value={noiseLevel} onChange={e => setNoiseLevel(e.target.value)}>
                  <option value="none">Off</option>
                  <option value="bajo">Bajo</option>
                  <option value="medio">Medio</option>
                  <option value="alto">Alto</option>
                </select>
              </div>
              <div>
                <label className="label" style={{ marginBottom: 4, display: 'block' }}>Viñeta</label>
                <select className="inp" style={{ width: '100%' }} value={vignetteLevel} onChange={e => setVignetteLevel(e.target.value)}>
                  <option value="none">Off</option>
                  <option value="sutil">Sutil</option>
                  <option value="medio">Medio</option>
                  <option value="intenso">Intenso</option>
                </select>
              </div>
            </div>
          </div>

          {/* Watermark (Simplified) */}
          <div className="control-group">
            <div className="control-header"><span className="label">Marca de Agua</span></div>
            <input className="inp" placeholder="Texto..." value={watermark} onChange={e => setWatermark(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
          </div>

          <div className="divider" style={{ marginTop: 'auto' }} />

          {/* Action Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Status / File Count */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)' }}>
              <span>Seleccionados: {files.length}</span>
              <span>Procesados: {Object.keys(results).length}</span>
            </div>

            {processing ? (
              <button className="btn btn-secondary" style={{ width: '100%', borderColor: 'var(--accent-danger)', color: 'var(--accent-danger)' }} onClick={() => window.location.reload()}>
                Cancelar
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowSaveModal(true)} disabled={Object.keys(overrides).length === 0}>
                  Guardar Preset
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={processAll} disabled={files.length === 0}>
                  {Object.keys(results).length > 0 && Object.keys(results).length === files.length ? 'Exportar de nuevo' : 'Exportar'}
                </button>
              </div>
            )}
          </div>

          <ExportPanel
            results={results}
            onDownloadSingle={downloadSingle}
            onDownloadAll={downloadAll}
            compact={true} // Assuming we update ExportPanel to be compact or it adapts
          />

        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setShowSaveModal(false)}>
          <div style={{ background: 'var(--bg-panel)', padding: 24, borderRadius: 8, width: 320, border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12, fontSize: 14 }}>Guardar Preset</h3>
            <input className="inp" placeholder="Nombre..."
              value={newPresetName} onChange={e => setNewPresetName(e.target.value)}
              style={{ width: '100%', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSavePreset}>Guardar</button>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowSaveModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
