// The cover renderer: draws panels, colour grades, lettering, grain,
// vignette, halftone, badge ribbon and star heat meter onto a canvas.
// Everything is drawn locally with the 2D context; no network, no fonts
// beyond the vendored Anton and Pacifico files.
//
// opts:
//   photos   — array of HTMLImageElement (or null entries)
//   panels   — per-panel { photo, panX, panY, zoom } (photo = index into photos)
//   layout   — one of the LAYOUTS keys in layouts.js
//   grade    — one of the GRADES keys in grades.js
//   title, subtitle — caption strings
//   titlePos — 'top' or 'bottom'
//   stars    — 0..5 filled stars in the heat meter
//   badge    — ribbon text (top-right corner)

import { layoutPanels } from './layouts.js';
import { GRADES } from './grades.js';

function drawPhotoInto(ctx, img, rect, panX, panY, zoom) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  // panX / panY are -1..1: 0 centres the photo, 1 pushes it to the edge.
  const dx = rect.x + (rect.w - pw) / 2 + panX * Math.max(0, (pw - rect.w) / 2);
  const dy = rect.y + (rect.h - ph) / 2 + panY * Math.max(0, (ph - rect.h) / 2);
  ctx.drawImage(img, dx, dy, pw, ph);
}

function gradePanel(ctx, rect, grade) {
  const g = ctx.createLinearGradient(rect.x, rect.y + rect.h, rect.x + rect.w, rect.y);
  for (const [pos, color] of grade.stops) g.addColorStop(pos, color);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
  // A warm wash rising from the bottom keeps the panels feeling sunset-lit.
  const wash = ctx.createLinearGradient(0, rect.y + rect.h * 0.55, 0, rect.y + rect.h);
  wash.addColorStop(0, 'rgba(0,0,0,0)');
  wash.addColorStop(1, 'rgba(20,0,40,0.28)');
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

function drawStar(ctx, cx, cy, r, filled, color) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? color : 'rgba(255,255,255,0.25)';
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.stroke();
}

function halftone(ctx, x, y, w, h, color) {
  // Rows of dots, growing toward the bottom of the block, behind the title.
  ctx.save();
  ctx.fillStyle = color;
  const step = Math.max(10, w * 0.018);
  for (let yy = y; yy < y + h; yy += step) {
    for (let xx = x; xx < x + w; xx += step) {
      const t = (yy - y) / h;
      const r = step * 0.16 + t * step * 0.22;
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function grain(ctx, W, H) {
  // Deterministic speckle so every render of the same cover looks identical.
  let seed = 1234567;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  ctx.save();
  const count = Math.floor((W * H) / 900);
  for (let i = 0; i < count; i += 1) {
    const v = next();
    ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(next() * W, next() * H, 1.6, 1.6);
  }
  ctx.restore();
}

function vignette(ctx, W, H) {
  const g = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function fitFont(ctx, text, family, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

/** Draws the full cover described by `opts` onto `canvas` (its own size). */
export function drawCover(canvas, opts) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const grade = GRADES[opts.grade] || GRADES.sunset;
  const panels = layoutPanels(opts.layout || 'hero', W, H);
  const title = (opts.title || '').trim();
  const subtitle = (opts.subtitle || '').trim();
  const titlePos = opts.titlePos === 'top' ? 'top' : 'bottom';

  // Backdrop: a deep sunset sky gradient; the polaroid layout shows it
  // between the tilted frames.
  const sky = ctx.createLinearGradient(0, 0, W, H);
  sky.addColorStop(0, grade.backdrop);
  sky.addColorStop(0.55, '#3d0a4d');
  sky.addColorStop(1, '#12041f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const border = Math.max(3, Math.round(Math.min(W, H) * 0.006));
  panels.forEach((rect, i) => {
    const spec = (opts.panels && opts.panels[i]) || { photo: 0, panX: 0, panY: 0, zoom: 1 };
    const img = opts.photos ? opts.photos[spec.photo] : null;
    ctx.save();
    if (rect.angle) {
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      ctx.translate(cx, cy);
      ctx.rotate((rect.angle * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }
    if (rect.angle) {
      // Polaroid frame: white border with a thicker foot, soft shadow.
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = Math.min(W, H) * 0.03;
      ctx.shadowOffsetY = Math.min(W, H) * 0.012;
      ctx.fillStyle = '#fdf8ef';
      const pad = Math.round(Math.min(W, H) * 0.02);
      const foot = Math.round(Math.min(W, H) * 0.07);
      ctx.fillRect(rect.x - pad, rect.y - pad, rect.w + pad * 2, rect.h + pad + foot);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (img) {
      drawPhotoInto(ctx, img, rect, spec.panX || 0, spec.panY || 0, spec.zoom || 1);
    } else {
      ctx.fillStyle = '#241533';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    gradePanel(ctx, rect, grade);
    ctx.restore();
    if (!rect.angle) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = border;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }
  });

  // ---- Lettering block ----
  const padX = W * 0.05;
  const blockW = W - padX * 2;
  const titleSize0 = Math.round(Math.min(W, H) * 0.13);
  const blockH = title ? titleSize0 * 1.55 : 0;
  const blockY = titlePos === 'top' ? H * 0.045 : H - H * 0.045 - blockH;
  if (title) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    halftone(ctx, padX, blockY - blockH * 0.08, blockW, blockH * 0.85, grade.accent);
    ctx.restore();
    const upper = title.toUpperCase();
    const size = fitFont(ctx, upper, 'Anton, sans-serif', blockW, titleSize0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${size}px Anton, sans-serif`;
    const cy = blockY + blockH * 0.42;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size * 0.09);
    ctx.strokeStyle = 'rgba(10,0,20,0.9)';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size * 0.18;
    ctx.shadowOffsetY = size * 0.05;
    ctx.strokeText(upper, W / 2, cy);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(upper, W / 2, cy);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    if (subtitle) {
      const subSize = fitFont(ctx, subtitle, 'Pacifico, cursive', blockW * 0.8, Math.round(size * 0.42));
      ctx.font = `${subSize}px Pacifico, cursive`;
      ctx.fillStyle = grade.neon;
      ctx.shadowColor = grade.neon;
      ctx.shadowBlur = subSize * 0.5;
      ctx.fillText(subtitle, W / 2, cy + size * 0.62);
      ctx.shadowBlur = 0;
    }
  }

  // ---- Badge ribbon, top-right ----
  const badgeText = (opts.badge || 'VICE CITY').trim().toUpperCase();
  if (badgeText) {
    const bh = Math.round(Math.min(W, H) * 0.052);
    const bw = Math.min(W * 0.3, badgeText.length * bh * 0.62 + W * 0.04);
    ctx.save();
    ctx.translate(W - bw / 2 - W * 0.02, H * 0.09);
    ctx.rotate(Math.PI / 14);
    ctx.fillStyle = grade.accent;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(bh * 0.52)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, 0, 1);
    ctx.restore();
  }

  // ---- Star heat meter, bottom-left ----
  const stars = Math.max(0, Math.min(5, opts.stars || 0));
  const starR = Math.round(Math.min(W, H) * 0.022);
  const starY = titlePos === 'bottom' ? H - H * 0.045 - blockH - starR * 2.4 : H - starR * 2.2;
  ctx.font = `bold ${Math.round(starR * 1.5)}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('HEAT', padX, starY);
  const heatW = ctx.measureText('HEAT').width;
  for (let s = 0; s < 5; s += 1) {
    drawStar(ctx, padX + heatW + starR * 2 + s * starR * 2.4, starY, starR, s < stars, '#ffd23e');
  }

  grain(ctx, W, H);
  vignette(ctx, W, H);
}
