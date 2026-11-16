// Motif japonais traditionnel de vagues en écailles, traversé par un flux d'eau.
import { PAPER, TAU, fill } from './palette.js';

const DEEP = '#16324f';
const MID = '#2b6f9e';
const FOAM = '#9fd4ee';

export function draw(ctx, w, h, t) {
  fill(ctx, w, h, DEEP);
  const radius = Math.min(w, h) / 6.5;
  const stepX = radius * 2;
  const stepY = radius * 0.5;
  const rows = Math.ceil(h / stepY) + 3;
  const cols = Math.ceil(w / stepX) + 2;

  // du haut vers le bas : chaque rangée recouvre la précédente
  for (let row = -1; row < rows; row++) {
    const y = row * stepY + radius * 0.5;
    const shift = row % 2 === 0 ? 0 : radius;
    for (let col = -1; col < cols; col++) {
      const x = col * stepX + shift;
      // une vague de lumière traverse le motif en diagonale
      const wave = 0.5 + 0.5 * Math.sin((x / w) * 4 + (y / h) * 3 - t * 1.1);
      ctx.fillStyle = DEEP;
      ctx.beginPath();
      ctx.arc(x, y, radius, Math.PI, TAU);
      ctx.closePath();
      ctx.fill();
      for (let ring = 0; ring < 4; ring++) {
        const r = radius * (1 - ring * 0.23);
        ctx.strokeStyle = ring === 0 ? PAPER : wave > 0.72 && ring === 1 ? FOAM : MID;
        ctx.globalAlpha = ring === 0 ? 0.95 : 0.55 + wave * 0.45;
        ctx.lineWidth = Math.max(1.5, radius * (ring === 0 ? 0.07 : 0.05));
        ctx.beginPath();
        ctx.arc(x, y, r, Math.PI, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }
}
