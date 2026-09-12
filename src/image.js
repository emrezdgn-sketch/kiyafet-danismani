const MAX_IMAGE_DIMENSION = 1568;
const JPEG_QUALITY = 0.85;

export function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      resolve({ dataUrl, base64: dataUrl.split(',')[1], mediaType: file.type });
    };
    reader.onerror = () => reject(new Error('Dosya okunamadı'));
    reader.readAsDataURL(file);
  });
}

export function applyFaceBlur(dataUrl, mediaType, centerX, centerY, radius) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
        const targetW = Math.max(1, Math.round(img.naturalWidth * scale));
        const targetH = Math.max(1, Math.round(img.naturalHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, targetW, targetH);

        if (radius > 0) {
          const cx = targetW * centerX;
          const cy = targetH * centerY;
          const r = radius * targetW;
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.clip();
          ctx.filter = 'blur(18px)';
          ctx.drawImage(img, 0, 0, targetW, targetH);
          ctx.restore();
        }

        const outUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        resolve({ dataUrl: outUrl, base64: outUrl.split(',')[1], mediaType: 'image/jpeg' });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Görsel işlenemedi'));
    img.src = dataUrl;
  });
}
