
import { WebGLEngine } from '../utils/webgl-engine.js';

let engine = null;
let offscreenCanvas = null;

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  try {
    if (type === 'INIT') {
      offscreenCanvas = new OffscreenCanvas(100, 100);
      engine = new WebGLEngine(offscreenCanvas);
      self.postMessage({ type: 'READY' });
    } else if (type === 'PROCESS_IMAGE') {
      const { id, imageBitmap, options } = payload;
      
      if (!engine) {
        offscreenCanvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
        engine = new WebGLEngine(offscreenCanvas);
      }

      engine.render(imageBitmap, options);
      
      const blob = await offscreenCanvas.convertToBlob({ 
        type: options.format || 'image/jpeg', 
        quality: options.quality || 0.9 
      });
      
      self.postMessage({ 
        type: 'PROCESS_COMPLETE', 
        payload: { id, blob } 
      });
      
      imageBitmap.close(); // Clean up memory
    }
  } catch (error) {
    self.postMessage({ type: 'ERROR', payload: { id: payload?.id, error: error.message } });
  }
};
