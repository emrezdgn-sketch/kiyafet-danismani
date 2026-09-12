import { SHARE_PALETTE, scoreTier } from './constants.js';

const SHARE_CARD_W = 1080;
const SHARE_CARD_H = 1350;
const SHARE_PHOTO_H = 760;

function shareTierColor(p) {
  if (p <= 40) return SHARE_PALETTE.accent;
  if (p <= 80) return SHARE_PALETTE.warning;
  return SHARE_PALETTE.success;
}

function drawCoverImage(ctx, img, iw, ih, dx, dy, dw, dh) {
  const ir = iw / ih;
  const dr = dw / dh;
  let sx, sy, sw, sh;
  if (ir > dr) { sh = ih; sw = sh * dr; sx = (iw - sw) / 2; sy = 0; }
  else { sw = iw; sh = sw / dr; sx = 0; sy = (ih - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const truncated = lines.slice(0, maxLines);
    let last = truncated[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) {
      last = last.slice(0, -1);
    }
    truncated[maxLines - 1] = `${last.replace(/\s+$/, '')}…`;
    return truncated;
  }
  return lines;
}

function drawShareCard(ctx, img, iw, ih, result) {
  ctx.fillStyle = SHARE_PALETTE.bg;
  ctx.fillRect(0, 0, SHARE_CARD_W, SHARE_CARD_H);
  drawCoverImage(ctx, img, iw, ih, 0, 0, SHARE_CARD_W, SHARE_PHOTO_H);

  const p = Math.max(0, Math.min(100, Number(result.puan) || 0));
  const tColor = shareTierColor(p);
  const tLabel = scoreTier(p).label.toLocaleUpperCase('tr-TR');

  const badgeR = 92;
  const badgeCx = SHARE_CARD_W - 140, badgeCy = SHARE_PHOTO_H;
  ctx.save();
  ctx.shadowColor = 'rgba(43,37,30,0.35)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 8;
  ctx.beginPath();
  ctx.arc(badgeCx, badgeCy, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = SHARE_PALETTE.bg;
  ctx.fill();
  ctx.restore();

  ctx.lineWidth = 14;
  ctx.strokeStyle = SHARE_PALETTE.line;
  ctx.beginPath();
  ctx.arc(badgeCx, badgeCy, badgeR - 18, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = tColor;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(badgeCx, badgeCy, badgeR - 18, -Math.PI / 2, -Math.PI / 2 + (p / 100) * Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = SHARE_PALETTE.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 56px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(String(p), badgeCx, badgeCy - 6);
  ctx.fillStyle = SHARE_PALETTE.inkFaint;
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('/100', badgeCx, badgeCy + 30);

  const padX = 64;
  let y = SHARE_PHOTO_H + 90;

  ctx.textAlign = 'left';
  ctx.fillStyle = SHARE_PALETTE.accent;
  ctx.font = '800 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('NASIL OLMUŞUM AI', padX, y);

  y += 60;
  ctx.fillStyle = tColor;
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(tLabel, padX, y);

  y += 56;
  ctx.fillStyle = SHARE_PALETTE.ink;
  ctx.font = '500 38px "Plus Jakarta Sans", sans-serif';
  const lines = wrapLines(ctx, result.genel_izlenim || '', SHARE_CARD_W - padX * 2, 4);
  const lineHeight = 50;
  lines.forEach((line, i) => ctx.fillText(line, padX, y + i * lineHeight));

  ctx.fillStyle = SHARE_PALETTE.inkFaint;
  ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('danismanik.pages.dev', padX, SHARE_CARD_H - 48);
}

export function buildShareCardBlob(imgDataUrl, result) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        const canvas = document.createElement('canvas');
        canvas.width = SHARE_CARD_W;
        canvas.height = SHARE_CARD_H;
        const ctx = canvas.getContext('2d');
        drawShareCard(ctx, img, img.naturalWidth, img.naturalHeight, result);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob); else reject(new Error('Kart oluşturulamadı'));
        }, 'image/png');
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Görsel yüklenemedi'));
    img.src = imgDataUrl;
  });
}
