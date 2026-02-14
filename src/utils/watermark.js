
export function createTextWatermark(text, options = {}) {
  const {
    fontSize = 48,
    fontFamily = 'Arial',
    color = 'white',
    opacity = 0.5,
    padding = 20
  } = options;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  ctx.font = `${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  
  canvas.width = metrics.width + padding * 2;
  canvas.height = fontSize + padding * 2;
  
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, padding, canvas.height / 2);
  
  return canvas;
}

export function createImageWatermark(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageUrl;
  });
}
