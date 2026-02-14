import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { useStudioStore } from './store/store';

// --- Components ---
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import PreviewPanel from './components/PreviewPanel';
import Filmstrip from './components/Filmstrip';

// --- Engine imports ---
import { runCompoundPipeline, applyTextWatermark, applyWatermark, resizeCanvas, loadImageFromFile, stepVignette, stepGrain, stepSharpen } from './engine/image-engine';
import { getBasePreset, initPresets, listPresets } from './engine/preset-loader';
import { loadLUTFile, applyHaldCLUT } from './engine/lut-processor';

// --- Lazy RAW ---
let _rawModule = null;
async function getRawModule() {
  if (!_rawModule) _rawModule = await import('./engine/raw-decoder');
  return _rawModule;
}

function isRawExtension(name) {
  const ext = '.' + name.split('.').pop().toLowerCase();
  return ['.arw', '.cr2', '.cr3', '.nef', '.dng', '.raf', '.orf', '.rw2', '.pef', '.srw', '.x3f', '.3fr', '.mrw'].includes(ext);
}

// ─── THUMBNAIL CACHE ─────────────────────────────────────
const thumbCache = new Map();
const PREVIEW_MAX = 1200;

function downscale(imgData, max) {
  const { width: w, height: h } = imgData;
  if (Math.max(w, h) <= max) return imgData;
  const s = max / Math.max(w, h);
  const nw = Math.round(w * s), nh = Math.round(h * s);
  const src = document.createElement('canvas');
  src.width = w; src.height = h;
  src.getContext('2d').putImageData(imgData, 0, 0);
  const dst = document.createElement('canvas');
  dst.width = nw; dst.height = nh;
  dst.getContext('2d').drawImage(src, 0, 0, nw, nh);
  return dst.getContext('2d').getImageData(0, 0, nw, nh);
}

async function loadStandardImage(file, maxEdge) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url;
    });
    const s = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const w = Math.round(img.width * s), h = Math.round(img.height * s);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    return c.getContext('2d').getImageData(0, 0, w, h);
  } finally { URL.revokeObjectURL(url); }
}

async function getThumbnail(fileObj) {
  if (thumbCache.has(fileObj.id)) return thumbCache.get(fileObj.id);
  let imageData;
  if (isRawExtension(fileObj.name)) {
    const rawMod = await getRawModule();
    const decoded = await rawMod.decodeRawFile(fileObj.file, { fast: true });
    if (!decoded?.imageData) throw new Error('RAW decode returned no data');
    imageData = downscale(decoded.imageData, PREVIEW_MAX);
  } else {
    imageData = await loadStandardImage(fileObj.file, PREVIEW_MAX);
  }
  const entry = { imageData, width: imageData.width, height: imageData.height };
  thumbCache.set(fileObj.id, entry);
  return entry;
}

// ─── PIPELINE ────────────────────────────────────────────
function buildOverrides(opts) {
  return {
    exposure: opts.exposure,
    contrast: (opts.contrast - 1) * 100,
    sat: opts.saturation * 100,
    vibrance: opts.vibrance * 100,
    highlights: opts.highlights * 100,
    shadows: opts.shadows * 100,
    whites: opts.whites * 100,
    blacks: opts.blacks * 100,
    wb_temp: opts.temperature,
    wb_tint: opts.tint,
    noise_level: 'none',
  };
}

function applyPipeline(imageData, opts) {
  const base = getBasePreset();
  const creative = { id: 'temp', pipeline: [] };
  runCompoundPipeline(imageData, base, creative, buildOverrides(opts));
  if (opts.lutImageData) applyHaldCLUT(imageData, opts.lutImageData, 1.0);
  // Effects: vignette, grain, sharpening
  if (opts.vignette > 0) stepVignette(imageData, { strength: opts.vignette });
  if (opts.grain > 0) stepGrain(imageData, { strength: opts.grain });
  if (opts.sharpening > 0) stepSharpen(imageData, { amount: opts.sharpening });
}

async function loadFullImage(file) {
  if (isRawExtension(file.name)) {
    const rawMod = await getRawModule();
    const decoded = await rawMod.decodeRawFile(file, { fast: false });
    const c = document.createElement('canvas');
    c.width = decoded.width; c.height = decoded.height;
    c.getContext('2d').putImageData(decoded.imageData, 0, 0);
    return c;
  }
  const img = await loadImageFromFile(file);
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  c.getContext('2d').drawImage(img, 0, 0);
  return c;
}

async function exportToDownload(file, opts) {
  const canvas = await loadFullImage(file);
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyPipeline(imgData, opts);
  ctx.putImageData(imgData, 0, 0);
  if (opts.logo) applyWatermark(canvas, opts.logo, opts.logo_pos, 0.8, opts.logo_size / 100);
  if (opts.watermark_text) applyTextWatermark(canvas, opts.watermark_text, opts.watermark_pos, opts.watermark_size / 100);
  let out = canvas;
  if (opts.outputSize > 0) out = resizeCanvas(out, opts.outputSize);
  const mimeMap = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const mime = mimeMap[opts.exportFormat] || 'image/jpeg';
  const blob = await new Promise(r => out.toBlob(r, mime, (opts.exportQuality || 92) / 100));
  const extMap = { jpeg: 'jpg', png: 'png', webp: 'webp' };
  const ext = extMap[opts.exportFormat] || 'jpg';
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = u; a.download = `final_${file.name.split('.')[0]}.${ext}`; a.click();
  URL.revokeObjectURL(u);
}

// ─── MAIN APP ────────────────────────────────────────────
function App() {
  const store = useStudioStore();
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [enginePresets, setEnginePresets] = useState([]);
  const debRef = useRef(null);
  const firstRef = useRef(true);

  const active = store.files.find(f => f.id === store.activeFileId);

  // Init presets
  useEffect(() => { initPresets().then(() => setEnginePresets(listPresets())).catch(console.error); }, []);

  // ─── PREVIEW ────────────────────────────────────────────
  const renderPreview = useCallback(async () => {
    if (!active?.file || !canvasRef.current) return;
    setLoading(true);
    store.setPreviewError(null);
    store.setPreviewProgress(5);
    try {
      store.setPreviewProgress(15);
      const thumb = await getThumbnail(active);
      store.setPreviewProgress(50);
      const cloned = new ImageData(new Uint8ClampedArray(thumb.imageData.data), thumb.width, thumb.height);
      applyPipeline(cloned, store.options);
      store.setPreviewProgress(85);
      const canvas = canvasRef.current;
      canvas.width = thumb.width;
      canvas.height = thumb.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.putImageData(cloned, 0, 0);
      if (store.options.logo) applyWatermark(canvas, store.options.logo, store.options.logo_pos, 0.8, store.options.logo_size / 100);
      if (store.options.watermark_text) applyTextWatermark(canvas, store.options.watermark_text, store.options.watermark_pos, store.options.watermark_size / 100);
      store.setPreviewProgress(100);
    } catch (e) {
      console.error("[Preview]", e);
      store.setPreviewError(e.message || 'Preview failed');
    } finally {
      setLoading(false);
    }
  }, [active, store.options]);

  // Debounced preview
  useEffect(() => {
    if (!active) return;
    if (debRef.current) clearTimeout(debRef.current);
    const delay = firstRef.current ? 0 : 60;
    firstRef.current = false;
    debRef.current = setTimeout(renderPreview, delay);
    return () => clearTimeout(debRef.current);
  }, [renderPreview]);

  useEffect(() => { firstRef.current = true; }, [store.activeFileId]);

  // ─── KEYBOARD SHORTCUTS ─────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      // Skip if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey && !e.ctrlKey) { e.preventDefault(); store.undo(); }
      else if (key === 'z' && e.shiftKey && !e.ctrlKey) { e.preventDefault(); store.redo(); }
      else if (key === 'r' && !e.ctrlKey) { e.preventDefault(); store.resetOptions(); }
      else if (key === 'h') { e.preventDefault(); store.toggleHistogram(); }
      else if (key === ' ') { e.preventDefault(); store.toggleCompare(); }
      else if (key === 'e' && !e.ctrlKey) { e.preventDefault(); if (active) exportCurrent(); }
      else if (key === 'arrowleft') {
        e.preventDefault();
        const idx = store.files.findIndex(f => f.id === store.activeFileId);
        if (idx > 0) store.setActiveFile(store.files[idx - 1].id);
      }
      else if (key === 'arrowright') {
        e.preventDefault();
        const idx = store.files.findIndex(f => f.id === store.activeFileId);
        if (idx < store.files.length - 1) store.setActiveFile(store.files[idx + 1].id);
      }
      else if (key === 'delete' || key === 'backspace') {
        e.preventDefault();
        if (store.activeFileId) { thumbCache.delete(store.activeFileId); store.removeFile(store.activeFileId); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, store]);

  // ─── FILE OPS ───────────────────────────────────────────
  const pick = (accept, multi, cb) => {
    const input = document.createElement('input');
    input.type = 'file'; input.multiple = multi; input.accept = accept;
    input.onchange = (e) => cb(e.target.files); input.click();
  };
  const importFiles = () => pick('.arw,.cr2,.cr3,.nef,.dng,.raf,.orf,.rw2,.pef,.srw,.x3f,.3fr,.mrw,.jpg,.jpeg,.png,.tiff,.tif,.bmp,.webp', true,
    (files) => store.addFiles(Array.from(files).map(f => ({ file: f, name: f.name }))));
  const importLogo = () => pick('image/png,image/svg+xml', false,
    (files) => { const f = files[0]; if (f) { const u = URL.createObjectURL(f); const img = new Image(); img.onload = () => store.setOptions({ logo: img }); img.src = u; } });
  const importLUT = () => pick('image/png', false,
    async (files) => { const f = files[0]; if (f) { try { const d = await loadLUTFile(f); store.setOptions({ lutImageData: d, lut: f.name }); } catch (e) { console.error(e); } } });

  const exportCurrent = async () => {
    if (!active?.file) return;
    store.setProcessing(true); store.setStage('Exporting...'); store.setProgress(50);
    try { await exportToDownload(active.file, store.options); store.updateFileStatus(active.id, 'done'); }
    catch (e) { console.error(e); store.updateFileStatus(active.id, 'error'); }
    store.setProgress(100); store.setProcessing(false); store.setStage('Done');
  };

  const exportOne = async (fo) => {
    store.updateFileStatus(fo.id, 'processing');
    try { await exportToDownload(fo.file, store.options); store.updateFileStatus(fo.id, 'done'); }
    catch { store.updateFileStatus(fo.id, 'error'); }
  };

  const runBatch = async () => {
    store.setProcessing(true);
    for (let i = 0; i < store.files.length; i++) {
      const f = store.files[i];
      store.setStage(`${i + 1}/${store.files.length} — ${f.name}`);
      store.setProgress(Math.round((i / store.files.length) * 100));
      store.updateFileStatus(f.id, 'processing');
      try { await exportToDownload(f.file, store.options); store.updateFileStatus(f.id, 'done'); }
      catch (e) { console.error(e); store.updateFileStatus(f.id, 'error'); }
    }
    store.setProgress(100); store.setProcessing(false); store.setStage('Batch Done');
  };

  // Drag & drop
  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); };
  const onDrop = (e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files?.length) store.addFiles(Array.from(e.dataTransfer.files).map(f => ({ file: f, name: f.name }))); };

  const removeActive = () => {
    if (store.activeFileId) {
      thumbCache.delete(store.activeFileId);
      store.removeFile(store.activeFileId);
    }
  };

  // ─── RENDER ─────────────────────────────────────────────
  return (
    <div className="flex h-[100dvh] bg-[#050506] text-zinc-300 font-sans overflow-hidden relative" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      {/* Drop overlay */}
      {dragging && (
        <div className="absolute inset-0 z-50 bg-blue-600/20 backdrop-blur-sm border-4 border-blue-500 flex items-center justify-center pointer-events-none animate-fade-in">
          <div className="bg-zinc-900/90 p-6 rounded-2xl border border-blue-500/50 shadow-2xl text-center">
            <Upload size={36} className="text-blue-500 mx-auto mb-3 animate-bounce" />
            <p className="text-lg font-black text-white uppercase tracking-tight">Drop to Import</p>
          </div>
        </div>
      )}

      <Sidebar
        visible={sidebar}
        onClose={() => setSidebar(false)}
        hasActiveFile={!!active}
        enginePresets={enginePresets}
        onImportLogo={importLogo}
        onImportLUT={importLUT}
        onExportCurrent={exportCurrent}
        onRunBatch={runBatch}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <Header
          fileCount={store.files.length}
          onImport={importFiles}
          onToggleSidebar={() => setSidebar(true)}
        />

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          <PreviewPanel
            canvasRef={canvasRef}
            loading={loading}
            onExportCurrent={exportCurrent}
            onRemoveActive={removeActive}
            thumbCache={thumbCache}
          />

          <Filmstrip
            thumbCache={thumbCache}
            onImport={importFiles}
            onExport={exportOne}
            onRemove={(id) => { thumbCache.delete(id); store.removeFile(id); }}
            onClear={() => { store.clearFiles(); thumbCache.clear(); }}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
