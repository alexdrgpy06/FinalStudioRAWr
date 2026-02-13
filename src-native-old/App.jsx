import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { 
  Image as ImageIcon, 
  Upload, 
  Settings, 
  Play, 
  X, 
  CheckCircle2, 
  Loader2, 
  Download,
  Trash2,
  Layers,
  Monitor,
  AlertCircle
} from 'lucide-react';
import { useStore } from './store/useStore';
import { parseCubeLUT } from './utils/webgl-engine';
import { createTextWatermark } from './utils/watermark';
import { decodeRaw, isRaw } from './utils/raw-decoder';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { downloadDir } from '@tauri-apps/api/path';

import { logger } from './utils/logger';

// --- Components ---

const FileCard = memo(({ fileItem, processedBlob, onRemove, isTauri }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    let url = null;

    const loadPreview = async () => {
      if (processedBlob) {
        url = URL.createObjectURL(processedBlob);
        if (active) setPreviewUrl(url);
        return;
      }

      const actualPath = fileItem.path || null;

      if (isTauri && actualPath && isRaw({ name: actualPath })) {
        setLoading(true);
        try {
          const dataUrl = await invoke('decode_raw', { path: actualPath });
          if (active) setPreviewUrl(dataUrl);
        } catch (err) {
          logger.error(`Failed to decode RAW: ${err}`);
          if (active) setError(true);
        } finally {
          if (active) setLoading(false);
        }
      } else if (fileItem.file) {
        url = URL.createObjectURL(fileItem.file);
        if (active) setPreviewUrl(url);
      }
    };

    loadPreview();

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [fileItem.file, fileItem.path, processedBlob, isTauri]);

  return (
    <div className="group relative aspect-square bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-all shadow-xl">
      {/* Image Preview */}
      {previewUrl ? (
        <img 
          src={previewUrl} 
          alt={fileItem.name} 
          className={`w-full h-full object-cover transition-opacity duration-500 ${fileItem.status === 'processing' ? 'opacity-30' : 'opacity-100'}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-950">
          {loading ? <Loader2 className="animate-spin text-zinc-700" size={24} /> : <ImageIcon className="text-zinc-800" size={24} />}
        </div>
      )}
      
      {/* Status Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {fileItem.status === 'processing' && (
          <Loader2 className="animate-spin text-blue-500" size={32} />
        )}
        {fileItem.status === 'complete' && (
          <div className="bg-green-600/20 backdrop-blur-sm p-2 rounded-full border border-green-500/50">
            <CheckCircle2 className="text-green-500" size={24} />
          </div>
        )}
        {fileItem.status === 'error' && (
          <div className="bg-red-600/20 backdrop-blur-sm p-2 rounded-full border border-red-500/50">
            <AlertCircle className="text-red-500" size={24} />
          </div>
        )}
      </div>

      {/* Info Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent translate-y-2 group-hover:translate-y-0 transition-transform">
        <p className="text-[10px] font-mono truncate">{fileItem.name}</p>
      </div>

      {/* Remove Button */}
      <button 
        onClick={() => onRemove(fileItem.id)}
        className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X size={14} />
      </button>
    </div>
  );
});

// --- Main App ---

function App() {
  const { 
    files, 
    addFiles, 
    removeFile, 
    lut, 
    setLut, 
    watermark, 
    setWatermark,
    processing,
    setProcessing,
    progress,
    setProgress,
    updateFileStatus,
    processedFiles,
    clearFiles
  } = useStore();

  const [showSettings, setShowSettings] = useState(false);
  const [isTauri, setIsTauri] = useState(false);
  const workerRef = useRef(null);

  useEffect(() => {
    // Check for Tauri
    const tauriActive = window.__TAURI__ !== undefined;
    setIsTauri(tauriActive);

    if (tauriActive) {
      // Listen for progress events from Rust
      const setupListener = async () => {
        const unlisten = await listen('process-progress', (event) => {
          const { path, success, error, progress: p } = event.payload;
          // Find the file by path
          const fileItem = useStore.getState().files.find(f => (f.path || f.file?.name) === path);
          if (fileItem) {
            updateFileStatus(fileItem.id, success ? 'complete' : 'error');
          }
          setProgress(p);
        });
        return unlisten;
      };

      const unlistenPromise = setupListener();

      return () => {
        unlistenPromise.then(fn => fn());
      };
    } else {
      // Initialize Worker for Browser Fallback
      workerRef.current = new Worker(
        new URL('./workers/processor.worker.js', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.onmessage = (e) => {
        const { type, payload } = e.data;
        if (type === 'PROCESS_COMPLETE') {
          updateFileStatus(payload.id, 'complete', payload.blob);
        } else if (type === 'ERROR') {
          updateFileStatus(payload.id, 'error');
          console.error('Worker error:', payload.error);
        }
      };

      workerRef.current.postMessage({ type: 'INIT' });

      return () => {
        workerRef.current.terminate();
      };
    }
  }, [updateFileStatus, setProgress]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files).map(f => ({
        file: f,
        name: f.name
    }));
    addFiles(selectedFiles);
  };

  const handleTauriFileOpen = async () => {
    try {
        const selected = await open({
        multiple: true,
        filters: [{
            name: 'Images',
            extensions: ['png', 'jpeg', 'jpg', 'webp', 'arw', 'cr2', 'nef', 'dng']
        }]
        });
        if (selected && Array.isArray(selected)) {
        addFiles(selected.map(path => ({
            path,
            name: path.split(/[\\/]/).pop(),
            type: 'image/unknown'
        })));
        }
    } catch (err) {
        alert(`Dialog Error: ${err}`);
    }
  };

  const handleLutUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const text = await file.text();
      const parsedLut = parseCubeLUT(text);
      setLut(parsedLut);
    }
  };

  const handleWatermarkText = (e) => {
    const text = e.target.value;
    if (text) {
      const canvas = createTextWatermark(text);
      setWatermark({ image: canvas, text, opacity: 0.5 });
    } else {
      setWatermark(null);
    }
  };

  const [processingOptions, setProcessingOptions] = useState({
    brightness: 0.0,
    contrast: 1.0,
    saturation: 1.0,
    adaptive_threshold: false,
    denoise: false
  });

  const startProcessing = async () => {
    setProcessing(true);
    setProgress(0);

    if (isTauri) {
      try {
        const outBase = await downloadDir();
        const filesToProcess = files
          .filter(f => f.status !== 'complete')
          .map(f => {
            const inputPath = f.path || f.file?.name;
            const fileName = f.name;
            const outputPath = `${outBase}\\processed_${fileName}`;
            return [inputPath, outputPath];
          });
        
        if (filesToProcess.length === 0) {
            setProcessing(false);
            return;
        }

        await invoke('process_bulk', {
          files: filesToProcess,
          options: processingOptions
        });
      } catch (err) {
        logger.error(`Bulk processing failed: ${err}`);
        alert(`Bulk Error: ${err}`);
      } finally {
        setProcessing(false);
      }
    } else {
      // BROWSER WORKER PROCESSING
      let completed = 0;
      const pendingFiles = files.filter(f => f.status !== 'complete');
      
      for (const fileItem of pendingFiles) {
        updateFileStatus(fileItem.id, 'processing');
        
        let imageBitmap;
        try {
          if (isRaw({ name: fileItem.name })) {
            imageBitmap = await decodeRaw(fileItem.file);
          } else {
            imageBitmap = await createImageBitmap(fileItem.file);
          }
        } catch (err) {
          console.error('Failed to decode image:', err);
          updateFileStatus(fileItem.id, 'error');
          continue;
        }
        
        let watermarkBitmap = null;
        if (watermark && watermark.image) {
          watermarkBitmap = await createImageBitmap(watermark.image);
        }
        
        const transferables = [imageBitmap];
        if (watermarkBitmap) transferables.push(watermarkBitmap);

        workerRef.current.postMessage({
          type: 'PROCESS_IMAGE',
          payload: {
            id: fileItem.id,
            imageBitmap,
            options: {
              lut,
              watermark: watermark ? {
                image: watermarkBitmap,
                opacity: watermark.opacity
              } : null
            }
          }
        }, transferables);

        completed++;
        setProgress((completed / pendingFiles.length) * 100);
      }
      setProcessing(false);
    }
  };

  const downloadAll = () => {
    Object.entries(processedFiles).forEach(([id, blob]) => {
      const fileItem = files.find(f => f.id === id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed_${fileItem.name}`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800 p-4 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
            <ImageIcon size={20} className="text-white" />
          </div>
          <h1 className="font-bold text-xl tracking-tight">ClioBulk</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${showSettings ? 'bg-blue-600 shadow-lg shadow-blue-600/30' : 'bg-zinc-800 hover:bg-zinc-700'}`}
          >
            <Settings size={18} />
            <span className="hidden sm:inline text-sm font-medium">Settings</span>
          </button>
          
          {Object.keys(processedFiles).length > 0 && (
            <button 
              onClick={downloadAll}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-600 hover:bg-green-500 transition-all shadow-lg shadow-green-600/20"
            >
              <Download size={18} />
              <span className="hidden sm:inline text-sm font-medium">Download All</span>
            </button>
          )}

          <button 
            disabled={files.length === 0 || processing}
            onClick={startProcessing}
            className="flex items-center gap-2 px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20"
          >
            {processing ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
            <span className="font-bold">
              {processing ? 'Processing...' : `Process ${files.length > 0 ? `(${files.length})` : ''}`}
            </span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Settings */}
        {showSettings && (
          <aside className="w-80 border-r border-zinc-800 p-6 overflow-y-auto bg-zinc-950 animate-in slide-in-from-left duration-300">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Settings size={20} className="text-blue-500" />
              Processing Options
            </h2>
            
            <div className="space-y-8">
              {/* Image Adjustments */}
              <section>
                <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ImageIcon size={14} />
                  Adjustments
                </h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <label className="text-zinc-400">Brightness</label>
                      <span className="text-blue-500 font-bold">{(processingOptions.brightness * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                      type="range" min="-1" max="1" step="0.1" 
                      value={processingOptions.brightness}
                      onChange={(e) => setProcessingOptions({...processingOptions, brightness: parseFloat(e.target.value)})}
                      className="w-full accent-blue-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <label className="text-zinc-400">Contrast</label>
                      <span className="text-blue-500 font-bold">{processingOptions.contrast.toFixed(1)}x</span>
                    </div>
                    <input 
                      type="range" min="0" max="3" step="0.1" 
                      value={processingOptions.contrast}
                      onChange={(e) => setProcessingOptions({...processingOptions, contrast: parseFloat(e.target.value)})}
                      className="w-full accent-blue-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <label className="text-zinc-400">Saturation</label>
                      <span className="text-blue-500 font-bold">{processingOptions.saturation.toFixed(1)}x</span>
                    </div>
                    <input 
                      type="range" min="0" max="2" step="0.1" 
                      value={processingOptions.saturation}
                      onChange={(e) => setProcessingOptions({...processingOptions, saturation: parseFloat(e.target.value)})}
                      className="w-full accent-blue-600"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                    <label className="text-xs font-medium text-zinc-400">Denoise</label>
                    <input 
                      type="checkbox" 
                      checked={processingOptions.denoise}
                      onChange={(e) => setProcessingOptions({...processingOptions, denoise: e.target.checked})}
                      className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                    <label className="text-xs font-medium text-zinc-400">Adaptive Threshold</label>
                    <input 
                      type="checkbox" 
                      checked={processingOptions.adaptive_threshold}
                      onChange={(e) => setProcessingOptions({...processingOptions, adaptive_threshold: e.target.checked})}
                      className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </section>

              {/* LUT Section */}
              <section>
                <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Layers size={14} />
                  Color Grading (LUT)
                </h3>
                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                  {lut ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate font-medium">Active LUT ({lut.size}x{lut.size})</span>
                      <button onClick={() => setLut(null)} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-2 cursor-pointer py-2 group">
                      <Upload size={20} className="text-zinc-500 group-hover:text-blue-500 transition-colors" />
                      <span className="text-xs text-zinc-400 font-medium">Upload .cube file</span>
                      <input type="file" accept=".cube" className="hidden" onChange={handleLutUpload} />
                    </label>
                  )}
                </div>
              </section>

              {/* Watermark Section */}
              <section>
                <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Watermark</h3>
                <div className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Text Watermark" 
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                    onChange={handleWatermarkText}
                    value={watermark?.text || ''}
                  />
                  {watermark && (
                    <div className="space-y-3 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                      <div className="flex justify-between items-center">
                        <label className="text-xs text-zinc-400 font-medium">Opacity</label>
                        <span className="text-xs font-bold text-blue-500">{Math.round(watermark.opacity * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="1" step="0.1" 
                        value={watermark.opacity}
                        onChange={(e) => setWatermark({ ...watermark, opacity: parseFloat(e.target.value) })}
                        className="w-full accent-blue-600"
                      />
                    </div>
                  )}
                </div>
              </section>

              <div className="pt-4">
                <button 
                  onClick={clearFiles}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-zinc-800 text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all group"
                >
                  <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold">Clear All Files</span>
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-black custom-scrollbar">
          {files.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="max-w-md w-full border-2 border-dashed border-zinc-800 rounded-[2rem] p-12 flex flex-col items-center text-center gap-4 hover:border-zinc-700 hover:bg-zinc-900/50 transition-all group">
                <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-xl">
                  <Upload className="text-zinc-500 group-hover:text-blue-500 transition-colors" />
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-1">Drop your photos here</h2>
                  <p className="text-zinc-500 text-sm">RAW, JPEG, or PNG. Everything stays on your device.</p>
                </div>
                <label 
                  onClick={isTauri ? handleTauriFileOpen : undefined}
                  className="mt-4 px-8 py-3 bg-white text-black rounded-full font-bold cursor-pointer hover:bg-zinc-200 transition-colors shadow-lg"
                >
                  Select Files
                  {!isTauri && <input type="file" multiple className="hidden" onChange={handleFileChange} accept="image/*,.arw,.cr2,.nef,.dng" />}
                </label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {files.map((fileItem) => (
                <FileCard 
                  key={fileItem.id} 
                  fileItem={fileItem} 
                  processedBlob={processedFiles[fileItem.id]}
                  onRemove={removeFile}
                  isTauri={isTauri}
                />
              ))}
              
              <label 
                onClick={isTauri ? handleTauriFileOpen : undefined}
                className="aspect-square border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-zinc-900/50 hover:border-zinc-700 cursor-pointer transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload size={20} className="text-zinc-500 group-hover:text-blue-500 transition-colors" />
                </div>
                <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Add More</span>
                {!isTauri && <input type="file" multiple className="hidden" onChange={handleFileChange} accept="image/*,.arw,.cr2,.nef,.dng" />}
              </label>
            </div>
          )}
        </main>
      </div>
      
      {/* Progress Bar (Fixed) */}
      {processing && (
        <div className="fixed bottom-0 left-0 w-full h-1.5 bg-zinc-900 z-50">
          <div 
            className="h-full bg-blue-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(37,99,235,0.5)]" 
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between items-center bg-zinc-950">
        <div className="flex gap-6 items-center">
          <p className="font-medium text-zinc-400">Ready to process <span className="text-white">{files.length}</span> files</p>
          <div className="flex gap-4 items-center border-l border-zinc-800 pl-6">
            <p className={`flex items-center gap-1.5 ${lut ? 'text-blue-400' : ''}`}>
              <Layers size={10} />
              {lut ? 'LUT Applied' : 'No LUT'}
            </p>
            <p className={`flex items-center gap-1.5 ${watermark ? 'text-blue-400' : ''}`}>
              <ImageIcon size={10} />
              {watermark ? 'Watermark Active' : 'No Watermark'}
            </p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${isTauri ? 'border-blue-500/30 text-blue-400 bg-blue-500/5 shadow-[0_0_10px_rgba(59,130,246,0.1)]' : 'border-zinc-800 text-zinc-500'}`}>
            <Monitor size={10} />
            <span className="font-bold tracking-widest">{isTauri ? 'NATIVE ENGINE' : 'WEB ENGINE'}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className="font-mono text-zinc-600">v2.0.0-optimized</p>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      </footer>
    </div>
  );
}

export default App;
