import { SHARE_PALETTE, scoreTier, improvementDelta, improvementStateText, formatDelta } from './constants.js';

const CARD_W = 1080;
const CARD_H = 1350;
const GUTTER = 8;
const HALF_W = (CARD_W - GUTTER) / 2;

function shareTierColor(p) {
  if (p <= 40) return SHARE_PALETTE.accent;
  if (p <= 80) return SHARE_PALETTE.warning;
  return SHARE_PALETTE.success;
}

function stateColor(state) {
  if (state === 'positive') return SHARE_PALETTE.success;
  if (state === 'negative') return SHARE_PALETTE.accent;
  return SHARE_PALETTE.inkSoft;
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Görsel yüklenemedi'));
    img.src = dataUrl;
  });
}

function drawCoverImage(ctx, img, dx, dy, dw, dh) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
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

function drawFooter(ctx) {
  ctx.textAlign = 'left';
  ctx.fillStyle = SHARE_PALETTE.accent;
  ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Nasıl Olmuşum?', 64, CARD_H - 48);
  ctx.textAlign = 'right';
  ctx.fillStyle = SHARE_PALETTE.inkFaint;
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('danismanik.pages.dev', CARD_W - 64, CARD_H - 48);
}

async function renderCard(draw) {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  await draw(ctx);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob); else reject(new Error('Kart oluşturulamadı'));
    }, 'image/png');
  });
}

// --- Share Type 1: Score Card (single analysis) ---

const SCORE_PHOTO_H = 760;

function drawScoreCard(ctx, img, result) {
  ctx.fillStyle = SHARE_PALETTE.bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  drawCoverImage(ctx, img, 0, 0, CARD_W, SCORE_PHOTO_H);

  const p = Math.max(0, Math.min(100, Number(result.puan) || 0));
  const tColor = shareTierColor(p);
  const tLabel = scoreTier(p).label.toLocaleUpperCase('tr-TR');

  const badgeR = 92;
  const badgeCx = CARD_W - 140, badgeCy = SCORE_PHOTO_H;
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
  ctx.font = '600 56px "Fraunces", "Plus Jakarta Sans", serif';
  ctx.fillText(String(p), badgeCx, badgeCy - 6);
  ctx.fillStyle = SHARE_PALETTE.inkFaint;
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('/100', badgeCx, badgeCy + 30);

  const padX = 64;
  let y = SCORE_PHOTO_H + 90;

  ctx.textAlign = 'left';
  ctx.fillStyle = tColor;
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(tLabel, padX, y);

  y += 56;
  ctx.fillStyle = SHARE_PALETTE.ink;
  ctx.font = '500 38px "Plus Jakarta Sans", sans-serif';
  const lines = wrapLines(ctx, result.genel_izlenim || '', CARD_W - padX * 2, 4);
  const lineHeight = 50;
  lines.forEach((line, i) => ctx.fillText(line, padX, y + i * lineHeight));

  y += lines.length * lineHeight + 44;
  ctx.fillStyle = SHARE_PALETTE.accent;
  ctx.font = '700 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Sen kaç verirdin?', padX, y);

  drawFooter(ctx);
}

export function buildShareCardBlob(imgDataUrl, result) {
  return renderCard(async (ctx) => {
    const img = await loadImage(imgDataUrl);
    drawScoreCard(ctx, img, result);
  });
}

// --- Share Type 2: Battle Card ("Hangisini Giyeyim?") ---

const BATTLE_PHOTO_H = 700;

function drawBattleCard(ctx, imgA, imgB, resultA, resultB, verdict) {
  ctx.fillStyle = SHARE_PALETTE.bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  drawCoverImage(ctx, imgA, 0, 0, HALF_W, BATTLE_PHOTO_H);
  drawCoverImage(ctx, imgB, HALF_W + GUTTER, 0, HALF_W, BATTLE_PHOTO_H);

  const pA = Math.max(0, Math.min(100, Number(resultA.puan) || 0));
  const pB = Math.max(0, Math.min(100, Number(resultB.puan) || 0));

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 76px "Fraunces", "Plus Jakarta Sans", serif';
  ctx.fillStyle = shareTierColor(pA);
  ctx.fillText(String(pA), HALF_W / 2, BATTLE_PHOTO_H + 90);
  ctx.fillStyle = shareTierColor(pB);
  ctx.fillText(String(pB), HALF_W + GUTTER + HALF_W / 2, BATTLE_PHOTO_H + 90);

  let y = BATTLE_PHOTO_H + 190;
  if (verdict.winner) {
    ctx.fillStyle = SHARE_PALETTE.accent;
    ctx.font = '700 48px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Bunu giy: ${verdict.winner}`, CARD_W / 2, y);
  } else {
    ctx.fillStyle = SHARE_PALETTE.accent;
    ctx.font = '700 36px "Plus Jakarta Sans", sans-serif';
    const lines = wrapLines(ctx, verdict.text, CARD_W - 128, 2);
    lines.forEach((line, i) => ctx.fillText(line, CARD_W / 2, y + i * 46));
    y += (lines.length - 1) * 46;
  }

  y += 64;
  ctx.fillStyle = SHARE_PALETTE.inkSoft;
  ctx.font = '600 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Sen hangisini seçerdin?', CARD_W / 2, y);

  drawFooter(ctx);
}

export function buildBattleCardBlob(imgDataUrlA, imgDataUrlB, resultA, resultB, verdict) {
  return renderCard(async (ctx) => {
    const [imgA, imgB] = await Promise.all([loadImage(imgDataUrlA), loadImage(imgDataUrlB)]);
    drawBattleCard(ctx, imgA, imgB, resultA, resultB, verdict);
  });
}

// --- Share Type 3: Glow-up Card (Before/After) ---

const GLOWUP_HEADER_H = 56;
const GLOWUP_PHOTO_H = 700;

function drawGlowUpCard(ctx, beforeImg, afterImg, beforeResult, afterResult) {
  ctx.fillStyle = SHARE_PALETTE.bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = SHARE_PALETTE.inkFaint;
  ctx.fillText('ÖNCE', 64, 40);
  ctx.fillStyle = SHARE_PALETTE.accent;
  ctx.fillText('SONRA', HALF_W + GUTTER + 64, 40);

  drawCoverImage(ctx, beforeImg, 0, GLOWUP_HEADER_H, HALF_W, GLOWUP_PHOTO_H);
  drawCoverImage(ctx, afterImg, HALF_W + GUTTER, GLOWUP_HEADER_H, HALF_W, GLOWUP_PHOTO_H);

  const { before, after, delta, state } = improvementDelta(beforeResult.puan, afterResult.puan);
  const tColor = stateColor(state);
  let y = GLOWUP_HEADER_H + GLOWUP_PHOTO_H + 80;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = SHARE_PALETTE.ink;
  ctx.font = '600 40px "Fraunces", "Plus Jakarta Sans", serif';
  ctx.fillText(`ÖNCE ${before} → SONRA ${after}`, CARD_W / 2, y);

  y += 90;
  ctx.fillStyle = tColor;
  ctx.font = '600 84px "Fraunces", "Plus Jakarta Sans", serif';
  ctx.fillText(formatDelta(delta), CARD_W / 2, y);

  y += 74;
  ctx.font = '700 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(improvementStateText(state), CARD_W / 2, y);

  drawFooter(ctx);
}

export function buildGlowUpCardBlob(beforeImgDataUrl, afterImgDataUrl, beforeResult, afterResult) {
  return renderCard(async (ctx) => {
    const [beforeImg, afterImg] = await Promise.all([loadImage(beforeImgDataUrl), loadImage(afterImgDataUrl)]);
    drawGlowUpCard(ctx, beforeImg, afterImg, beforeResult, afterResult);
  });
}
