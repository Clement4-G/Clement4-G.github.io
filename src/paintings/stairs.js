// Escalier sans fin : les marches défilent, le point lumineux grimpe sans jamais monter.
import { CYAN, GOLD, NIGHT, PAPER, TAU, fill } from './palette.js';

function step(ctx, x, y, sw, sh, depth, alpha) {
  ctx.globalAlpha = alpha;
  // dessus de la marche
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + sw, y - sw * 0.5);
  ctx.lineTo(x + sw + depth, y - sw * 0.5 + depth * 0.5);
  ctx.lineTo(x + depth, y + depth * 0.5);
  ctx.closePath();
  ctx.fill();
  // contremarche
  ctx.fillStyle = '#8f8a7c';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + depth, y + depth * 0.5);
  ctx.lineTo(x + depth, y + depth * 0.5 + sh);
  ctx.lineTo(x, y + sh);
  ctx.closePath();
  ctx.fill();
  // flanc
  ctx.fillStyle = '#4a4740';
  ctx.beginPath();
  ctx.moveTo(x + depth, y + depth * 0.5);
  ctx.lineTo(x + sw + depth, y - sw * 0.5 + depth * 0.5);
  ctx.lineTo(x + sw + depth, y - sw * 0.5 + depth * 0.5 + sh);
  ctx.lineTo(x + depth, y + depth * 0.5 + sh);
  ctx.closePath();
  ctx.fill();
}

export function draw(ctx, w, h, t) {
  fill(ctx, w, h, NIGHT);
  const unit = Math.min(w, h) / 9;
  const sw = unit * 1.5;
  const sh = unit * 0.62;
  const depth = unit * 1.1;
  const dx = sw * 0.62;
  const dy = sh + sw * 0.31;
  const phase = (t * 0.45) % 1;
  const cx = w * 0.42;
  const cy = h * 0.56;
  const count = 9;

  // de l'arrière vers l'avant : la marche la plus haute est dessinée en premier
  for (let i = count; i >= -count; i--) {
    const k = i - phase;
    const x = cx + k * dx;
    const y = cy - k * dy;
    const alpha = Math.max(0, 1 - Math.abs(k) / count);
    if (alpha > 0.02) step(ctx, x, y, sw, sh, depth, alpha);
  }

  // le grimpeur : il reste au centre et sautille de marche en marche
  const hop = Math.abs(Math.sin(phase * Math.PI)) * unit * 0.55;
  const px = cx + sw * 0.5 + depth * 0.5;
  const py = cy - sw * 0.25 + depth * 0.25 - unit * 0.3 - hop;
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = CYAN;
  ctx.beginPath();
  ctx.arc(px, py, unit * 0.5, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(px, py, unit * 0.2, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = GOLD;
  ctx.lineWidth = Math.max(1, unit * 0.04);
  ctx.globalAlpha = 0.5;
  ctx.strokeRect(unit * 0.5, unit * 0.5, w - unit, h - unit);
  ctx.globalAlpha = 1;
}
