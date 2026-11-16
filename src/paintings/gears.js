// Mécanisme d'horlogerie : des rouages engrenés qui tournent à des vitesses cohérentes.
import { GOLD, NIGHT, NIGHT_2, PAPER, TAU, fill } from './palette.js';

function gear(ctx, x, y, radius, teeth, angle, color) {
  const tooth = radius * 0.16;
  const steps = teeth * 4;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = angle + (i / steps) * TAU;
    const high = i % 4 === 1 || i % 4 === 2;
    const r = high ? radius + tooth : radius - tooth * 0.35;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // évidements entre les rayons
  ctx.fillStyle = NIGHT;
  const spokes = 5;
  for (let i = 0; i < spokes; i++) {
    const a = angle + (i / spokes) * TAU;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.7, a + 0.16, a + TAU / spokes - 0.16);
    ctx.arc(x, y, radius * 0.3, a + TAU / spokes - 0.3, a + 0.3, true);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.16, 0, TAU);
  ctx.fill();
  ctx.fillStyle = NIGHT;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.06, 0, TAU);
  ctx.fill();
}

export function draw(ctx, w, h, t) {
  fill(ctx, w, h, NIGHT);
  const unit = Math.min(w, h);

  // cadran : graduations des minutes
  ctx.strokeStyle = NIGHT_2;
  ctx.lineWidth = Math.max(1, unit * 0.006);
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * TAU;
    const r1 = unit * (i % 5 === 0 ? 0.4 : 0.43);
    const r2 = unit * 0.46;
    ctx.beginPath();
    ctx.moveTo(w / 2 + Math.cos(a) * r1, h / 2 + Math.sin(a) * r1);
    ctx.lineTo(w / 2 + Math.cos(a) * r2, h / 2 + Math.sin(a) * r2);
    ctx.stroke();
  }

  // trois roues : la vitesse est inversement proportionnelle au nombre de dents
  const base = t * 0.5;
  const big = { x: w * 0.4, y: h * 0.56, r: unit * 0.24, teeth: 24 };
  const mid = { r: unit * 0.13, teeth: 13 };
  const small = { r: unit * 0.085, teeth: 8 };
  const reach = (a, b) => a.r + b.r + a.r * 0.1;
  mid.x = big.x + Math.cos(-0.5) * reach(big, mid);
  mid.y = big.y + Math.sin(-0.5) * reach(big, mid);
  small.x = mid.x + Math.cos(0.75) * reach(mid, small);
  small.y = mid.y + Math.sin(0.75) * reach(mid, small);

  gear(ctx, big.x, big.y, big.r, big.teeth, base, GOLD);
  gear(ctx, mid.x, mid.y, mid.r, mid.teeth, -base * (big.teeth / mid.teeth) + 0.24, PAPER);
  gear(ctx, small.x, small.y, small.r, small.teeth, base * (big.teeth / small.teeth) + 0.1, '#8fa3b8');
}
