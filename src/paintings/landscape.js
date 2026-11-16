// Paysage peint : collines, ciel et nuages en aplats doux, lumière qui change lentement.
import { TAU } from './palette.js';

function hills(ctx, w, h, base, amp, freq, shift, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, h);
  const stepX = Math.max(6, w / 60);
  for (let x = 0; x <= w + stepX; x += stepX) {
    const nx = x / w;
    const y = base - Math.sin(nx * freq + shift) * amp - Math.sin(nx * freq * 2.3 + shift * 1.7) * amp * 0.35;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

function cloud(ctx, x, y, size) {
  ctx.beginPath();
  ctx.arc(x, y, size, 0, TAU);
  ctx.arc(x + size * 1.1, y - size * 0.35, size * 1.25, 0, TAU);
  ctx.arc(x + size * 2.4, y, size * 1.05, 0, TAU);
  ctx.arc(x + size * 1.2, y + size * 0.35, size * 1.1, 0, TAU);
  ctx.fill();
}

export function draw(ctx, w, h, t) {
  // la lumière passe lentement du matin à la fin de journée, puis revient
  const day = 0.5 + 0.5 * Math.sin(t * 0.12);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, `hsl(${205 - day * 12}, 62%, ${62 + day * 8}%)`);
  sky.addColorStop(0.7, `hsl(${42 - day * 14}, 80%, ${84 - day * 4}%)`);
  ctx.globalAlpha = 1;
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const unit = Math.min(w, h);

  // soleil
  const sunX = w * (0.72 - day * 0.1);
  const sunY = h * (0.3 + day * 0.12);
  ctx.fillStyle = 'rgba(255, 244, 214, 0.35)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, unit * 0.16, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff6dc';
  ctx.beginPath();
  ctx.arc(sunX, sunY, unit * 0.085, 0, TAU);
  ctx.fill();

  // nuages qui dérivent
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  const span = w + unit;
  for (let i = 0; i < 4; i++) {
    const x = ((i * 0.31 * span + t * unit * (0.018 + i * 0.004)) % span) - unit * 0.5;
    cloud(ctx, x, h * (0.14 + i * 0.075), unit * (0.045 + (i % 2) * 0.02));
  }

  // trois plans de collines, du plus loin au plus proche
  hills(ctx, w, h, h * 0.62, unit * 0.07, 5.2, 0.6, '#9cc5b0');
  hills(ctx, w, h, h * 0.74, unit * 0.09, 3.6, 2.1, '#6fa67a');
  hills(ctx, w, h, h * 0.9, unit * 0.07, 2.4, 4.0, '#3f7a52');

  // herbes qui bougent au premier plan
  ctx.strokeStyle = '#2c5c3c';
  ctx.lineWidth = Math.max(1, unit * 0.006);
  for (let i = 0; i < 46; i++) {
    const x = (i / 46) * w + (i % 3) * 4;
    const sway = Math.sin(t * 1.3 + i * 0.7) * unit * 0.012;
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.quadraticCurveTo(x + sway * 0.5, h - unit * 0.05, x + sway, h - unit * (0.07 + (i % 4) * 0.012));
    ctx.stroke();
  }
}
