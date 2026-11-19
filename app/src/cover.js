// Draws the multi-panel GTA-style cover onto a canvas: the photo panels
// with cream gutters and a slight pasted tilt, the colour grade, a bottom
// scrim, caption chips, the gradient title with its neon script subtitle,
// the badges, the press-quote strip and the tagline band with palm
// silhouettes. Everything is drawn from `state` alone, and the grain uses
// a seeded random stream, so the same state always draws the same pixels.

import { layoutById } from './layouts.js';
import { gradeById } from './grades.js';

/** The three export sizes the app offers. */
export const SIZES = [
  { id: '1920x1080', w: 1920, h: 1080, label: 'Landscape 1920 × 1080' },
  { id: '1080x1080', w: 1080, h: 1080, label: 'Square 1080 × 1080' },
  { id: '1080x1350', w: 1080, h: 1350, label: 'Portrait 1080 × 1350' },
];

/** Returns the size with this id, or the landscape size when unknown. */
export function sizeById(id) {
  return SIZES.find((entry) => entry.id === id) ?? SIZES[0];
}

/** A tiny deterministic hash of a string, for seeding the grain. */
export function hashString(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}

/** A seeded random stream (mulberry32): same seed, same numbers. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A rounded-rectangle path (older canvas builds lack ctx.roundRect). */
export function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

/** Shrinks a font until `text` fits `maxWidth`, returning the size used. */
export function fitFont(ctx, text, family, weight, start, maxWidth) {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/** Draws `img` to cover `rect`, zoomed and panned by the panel state. */
export function drawPhotoCover(ctx, img, rect, zoom, dx, dy) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const cx = rect.x + rect.w / 2 + dx * rect.w;
  const cy = rect.y + rect.h / 2 + dy * rect.h;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
}

/** Draws one panel: its photo clipped to the rect, tilted, with a white edge. */
export function drawPanel(ctx, rect, panel, img) {
  ctx.save();
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  ctx.translate(cx, cy);
  ctx.rotate((panel.tilt ?? 0) * Math.PI / 180);
  // Tilted corners would show the gutter, so draw the photo a touch large.
  const pad = (panel.tilt ? 0.04 : 0) * Math.max(rect.w, rect.h);
  const inner = { x: -rect.w / 2 - pad, y: -rect.h / 2 - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 };
  ctx.beginPath();
  ctx.rect(inner.x, inner.y, inner.w, inner.h);
  ctx.clip();
  if (img) {
    drawPhotoCover(ctx, img, inner, panel.zoom ?? 1, panel.dx ?? 0, panel.dy ?? 0);
  } else {
    ctx.fillStyle = '#241a33';
    ctx.fillRect(inner.x, inner.y, inner.w, inner.h);
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = Math.max(1.5, rect.w * 0.004);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** Lays the grade wash over the whole collage. */
export function applyGrade(ctx, w, h, grade) {
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(1, grade.bottom);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  ctx.save();
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Draws a caption chip: a dark pill with the panel's place, time and line. */
export function drawChip(ctx, rect, chip, anchor, h, badge) {
  const text = chip.trim().toUpperCase();
  if (!text) return;
  const pillH = Math.max(20, h * 0.034);
  const padX = pillH * 0.55;
  let size = pillH * 0.52;
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  const maxW = rect.w - padX * 2 - 8;
  while (size > 10 && ctx.measureText(text).width > maxW) {
    size -= 1;
    ctx.font = `700 ${size}px system-ui, sans-serif`;
  }
  const pillW = ctx.measureText(text).width + padX * 2;
  const x = anchor === 'right' ? rect.x + rect.w - pillW - 10 : rect.x + 10;
  let y = rect.y + 10;
  // A long right-anchored chip can slide left under the WANTED badge: when
  // it would cross the badge zone, drop it below the badge stack instead.
  if (badge && anchor === 'right' && x < badge.right + 12 && rect.y < badge.bottom) {
    y = badge.bottom + 12;
  }
  ctx.save();
  ctx.fillStyle = 'rgba(8, 8, 14, 0.85)';
  roundRectPath(ctx, x, y, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX, y + pillH / 2 + 1);
  ctx.restore();
}

/** Draws the gradient title and the neon script subtitle. */
export function drawTitle(ctx, w, h, title, subtitle) {
  const text = title.trim().toUpperCase();
  const baseY = h * 0.845;
  if (text) {
    const start = w * 0.115;
    const size = fitFont(ctx, text, 'Anton, sans-serif', 400, start, w * 0.94);
    const top = baseY - size * 0.72;
    const grad = ctx.createLinearGradient(0, top, 0, baseY + size * 0.12);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.45, '#ffe9a8');
    grad.addColorStop(0.72, '#ffb347');
    grad.addColorStop(1, '#ff5e8a');
    ctx.save();
    ctx.translate(w / 2, baseY);
    ctx.rotate(-0.012);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.085;
    ctx.strokeStyle = '#0d0518';
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = grad;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
  const sub = subtitle.trim();
  if (sub) {
    const size = fitFont(ctx, sub, 'Pacifico, cursive', 400, h * 0.045, w * 0.7);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `400 ${size}px Pacifico, cursive`;
    ctx.lineWidth = size * 0.07;
    ctx.strokeStyle = 'rgba(20, 0, 30, 0.65)';
    ctx.strokeText(sub, w / 2, h * 0.905);
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = size * 0.55;
    ctx.fillStyle = '#ff7ad9';
    ctx.fillText(sub, w / 2, h * 0.905);
    ctx.restore();
  }
}

/** Draws a palm silhouette from the ground up, fronds spreading wide. */
export function drawPalm(ctx, x, y, s, flip) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.strokeStyle = 'rgba(12, 4, 18, 0.92)';
  ctx.fillStyle = 'rgba(12, 4, 18, 0.92)';
  ctx.lineCap = 'round';
  ctx.lineWidth = s * 0.055;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(s * 0.08, -s * 0.5, s * 0.22, -s * 0.95);
  ctx.stroke();
  const topX = s * 0.22;
  const topY = -s * 0.95;
  for (let i = 0; i < 6; i += 1) {
    const a = -Math.PI * (0.06 + i * 0.17);
    const ex = topX + Math.cos(a) * s * 0.58;
    const ey = topY + Math.sin(a) * s * 0.4 + s * 0.2;
    ctx.lineWidth = s * 0.042;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.cos(a) * s * 0.32, topY + Math.sin(a) * s * 0.18, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

/** Draws the wanted stars, the gold seal, the volume chip, the ribbon and the starburst. */
export function drawBadges(ctx, w, h, badges) {
  const u = Math.min(w, h) / 1080;
  if (badges.wanted) {
    const bh = h * 0.058;
    const x = w * 0.012;
    const y = h * 0.012;
    const pad = bh * 0.32;
    ctx.save();
    ctx.font = `800 ${bh * 0.42}px system-ui, sans-serif`;
    const wantedW = ctx.measureText('WANTED').width;
    ctx.font = `${bh * 0.44}px system-ui, sans-serif`;
    const starsW = ctx.measureText('★★★★★').width;
    const bw = pad * 2 + wantedW + pad * 0.8 + starsW;
    ctx.fillStyle = 'rgba(8, 8, 12, 0.92)';
    roundRectPath(ctx, x, y, bw, bh, 6 * u);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1.5 * u;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${bh * 0.42}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('WANTED', x + pad, y + bh * 0.52);
    ctx.fillStyle = '#ffd76a';
    ctx.font = `${bh * 0.44}px system-ui, sans-serif`;
    ctx.fillText('★★★★★', x + pad + wantedW + pad * 0.8, y + bh * 0.52);
    ctx.restore();
    const hy = y + bh + 8 * u;
    const heatH = bh * 0.62;
    ctx.save();
    ctx.font = `800 ${bh * 0.3}px system-ui, sans-serif`;
    const heatW = ctx.measureText('HEAT').width;
    const barsX = x + pad + heatW + pad * 0.7;
    const barsW = bw - (barsX - x) - pad;
    const barW = (barsW / 5) * 0.68;
    const barGap = (barsW / 5) * 0.32;
    ctx.fillStyle = 'rgba(8, 8, 12, 0.85)';
    roundRectPath(ctx, x, hy, bw, heatH, 5 * u);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('HEAT', x + pad, hy + heatH / 2 + 1);
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = i < 4 ? '#ff5a2a' : 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(barsX + i * (barW + barGap), hy + heatH * 0.2, barW, heatH * 0.6);
    }
    ctx.restore();
  }
  if (badges.seal) {
    const r = w * 0.042;
    const cx = w - w * 0.07;
    const cy = h * 0.185;
    const gold = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    gold.addColorStop(0, '#ffedb0');
    gold.addColorStop(0.6, '#e8b23a');
    gold.addColorStop(1, '#a8740e');
    ctx.save();
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5c3a00';
    ctx.lineWidth = Math.max(1.5, r * 0.07);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#3a2400';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${r * 0.34}px system-ui, sans-serif`;
    ctx.fillText('EST.', cx, cy - r * 0.22);
    ctx.fillText('2026', cx, cy + r * 0.22);
    ctx.restore();
  }
  if (badges.vol) {
    const text = 'VOL. 06';
    ctx.save();
    ctx.font = `800 ${Math.max(13, h * 0.018)}px system-ui, sans-serif`;
    const pad = h * 0.012;
    const pillW = ctx.measureText(text).width + pad * 2;
    const pillH = h * 0.034;
    const x = w - w * 0.07 - pillW / 2;
    const y = h * 0.185 + w * 0.042 + h * 0.012;
    ctx.fillStyle = '#f5efe4';
    roundRectPath(ctx, x, y, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = '#1d1420';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + pillW / 2, y + pillH / 2 + 1);
    ctx.restore();
  }
  if (badges.ribbon) {
    ctx.save();
    ctx.translate(w - 100, 100);
    ctx.rotate(Math.PI / 4);
    const grad = ctx.createLinearGradient(-190, 0, 190, 0);
    grad.addColorStop(0, '#ff2e63');
    grad.addColorStop(1, '#ff7a59');
    ctx.fillStyle = grad;
    ctx.fillRect(-190, -14, 380, 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 13px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("COLLECTOR'S EDITION", 0, 1);
    ctx.restore();
  }
  if (badges.starburst) {
    const cx = w * 0.945;
    const cy = h * 0.895;
    const r1 = w * 0.038;
    const r2 = w * 0.024;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.21);
    ctx.beginPath();
    for (let i = 0; i < 24; i += 1) {
      const r = i % 2 === 0 ? r1 : r2;
      const a = (i / 24) * Math.PI * 2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffd21f';
    ctx.fill();
    ctx.strokeStyle = '#0d0518';
    ctx.lineWidth = Math.max(1.5, r1 * 0.05);
    ctx.stroke();
    ctx.fillStyle = '#0d0518';
    ctx.font = `800 ${r1 * 0.3}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ORIGINAL', 0, 1);
    ctx.restore();
  }
}

/** Draws the press-quote strip above the tagline band. */
export function drawQuote(ctx, w, h, quote, by) {
  const text = `★★★★★  “${quote.trim()}” — ${by.trim()}`;
  const size = Math.max(13, h * 0.018);
  ctx.save();
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  const pad = size * 0.9;
  const pillW = Math.min(w * 0.92, ctx.measureText(text).width + pad * 2);
  const pillH = size * 1.9;
  const x = (w - pillW) / 2;
  const y = h * 0.938 - pillH / 2;
  ctx.fillStyle = 'rgba(8, 8, 14, 0.78)';
  roundRectPath(ctx, x, y, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = '#ffd76a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, y + pillH / 2 + 1);
  ctx.restore();
}

/** Draws the bottom band: palms at the corners, tagline, credit, barcode. */
export function drawTagline(ctx, w, h, tagline) {
  const bandY = h * 0.962;
  ctx.save();
  ctx.fillStyle = 'rgba(8, 6, 14, 0.88)';
  ctx.fillRect(0, bandY, w, h - bandY);
  drawPalm(ctx, w * 0.012, h, h * 0.085, false);
  drawPalm(ctx, w * 0.988, h, h * 0.085, true);
  ctx.fillStyle = '#f5efe4';
  ctx.font = `800 ${Math.max(12, h * 0.016)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try {
    ctx.letterSpacing = '3px';
  } catch {
    // Older canvas builds ignore letterSpacing; the tagline still reads.
  }
  ctx.fillText(tagline.trim().toUpperCase(), w / 2, bandY + (h - bandY) / 2 + 1);
  try {
    ctx.letterSpacing = '0px';
  } catch {
    // No-op on builds without letterSpacing.
  }
  ctx.font = `700 ${Math.max(10, h * 0.012)}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('VICE COAST STUDIO', w * 0.075, bandY + (h - bandY) / 2 + 1);
  const barW = w * 0.045;
  const barH = (h - bandY) * 0.55;
  const barX = w * 0.925 - barW;
  const barY = bandY + (h - bandY - barH) / 2;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(barX - 3, barY - 3, barW + 6, barH + 6);
  ctx.fillStyle = '#0d0518';
  const bars = [2, 1, 3, 1, 2, 2, 1, 4, 1, 2, 3, 1, 1, 2];
  let bx = barX;
  for (const bw of bars) {
    ctx.fillRect(bx, barY, bw * (barW / 26), barH);
    bx += (bw + 1.4) * (barW / 26);
  }
  ctx.restore();
}

/** Draws film grain from a seeded stream, so the output is deterministic. */
export function drawGrain(ctx, w, h, seed) {
  const rand = mulberry32(seed);
  ctx.save();
  for (let i = 0; i < 1800; i += 1) {
    const light = rand() > 0.5;
    ctx.fillStyle = light ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(rand() * w, rand() * h, 1.6, 1.6);
  }
  ctx.restore();
}

/** Darkens the corners so the middle of the collage pops. */
export function drawVignette(ctx, w, h, strength) {
  const r = Math.max(w, h) * 0.72;
  const grad = ctx.createRadialGradient(w / 2, h / 2, r * 0.55, w / 2, h / 2, r);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, `rgba(0, 0, 0, ${strength})`);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/**
 * Draws the whole cover for `state` onto `canvas`, using the loaded images
 * in `images` (a Map from photo id to an HTMLImageElement). Photos that
 * have not loaded yet draw as a dark panel so the render never throws.
 */
export function drawCover(canvas, state, images) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const layout = layoutById(state.layoutId);
  const grade = gradeById(state.gradeId);
  const gutter = Math.round(Math.min(w, h) * 0.012);

  ctx.fillStyle = '#f5efe4';
  ctx.fillRect(0, 0, w, h);

  const badge = {
    right: w * 0.012 + 310 * (Math.min(w, h) / 1080),
    bottom: h * 0.012 + h * 0.058 * 2.4,
  };
  layout.panels.forEach((panel, i) => {
    const rect = {
      x: panel.x * w + gutter / 2,
      y: panel.y * h + gutter / 2,
      w: panel.w * w - gutter,
      h: panel.h * h - gutter,
    };
    const slot = state.panels[i] ?? { photo: 'car', chip: '', zoom: 1, dx: 0, dy: 0 };
    drawPanel(ctx, rect, panel, images.get(slot.photo) ?? null);
    const nearBadge = rect.x < badge.right && rect.y < badge.bottom;
    drawChip(ctx, rect, slot.chip, nearBadge ? 'right' : 'left', h, badge);
  });

  applyGrade(ctx, w, h, grade);

  const scrim = ctx.createLinearGradient(0, h * 0.6, 0, h * 0.97);
  scrim.addColorStop(0, 'rgba(5, 5, 12, 0)');
  scrim.addColorStop(1, 'rgba(5, 5, 12, 0.62)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, w, h);

  drawTitle(ctx, w, h, state.title, state.subtitle);
  if (state.badges.quote && state.quote.trim()) drawQuote(ctx, w, h, state.quote, state.quoteBy);
  drawBadges(ctx, w, h, state.badges);
  drawTagline(ctx, w, h, state.tagline);

  const seed = hashString(
    [state.layoutId, state.gradeId, state.title, state.subtitle, state.sizeId].join('|'),
  );
  drawGrain(ctx, w, h, seed);
  drawVignette(ctx, w, h, grade.vignette);
}
