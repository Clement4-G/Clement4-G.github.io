// Damier qui se déforme en vague : la base visuelle de l'échiquier.
import { GOLD, INK, PAPER, fill } from './palette.js';

export function draw(ctx, w, h, t) {
  fill(ctx, w, h, INK);
  const cols = 12;
  const rows = 9;
  const cw = w / cols;
  const ch = h / rows;

  // chaque sommet de la grille est poussé par une onde qui part du centre
  const point = (i, j) => {
    const x = i * cw;
    const y = j * ch;
    const dx = x - w / 2;
    const dy = y - h / 2;
    const dist = Math.hypot(dx, dy) / Math.min(w, h);
    const push = Math.sin(dist * 9 - t * 1.4) * Math.min(cw, ch) * 0.34 * Math.exp(-dist * 1.6);
    const angle = Math.atan2(dy, dx);
    return [x + Math.cos(angle) * push, y + Math.sin(angle) * push];
  };

  ctx.fillStyle = PAPER;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if ((i + j) % 2 === 0) continue;
      const a = point(i, j);
      const b = point(i + 1, j);
      const c = point(i + 1, j + 1);
      const d = point(i, j + 1);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(c[0], c[1]);
      ctx.lineTo(d[0], d[1]);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.strokeStyle = GOLD;
  ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.012);
  ctx.strokeRect(ctx.lineWidth * 2, ctx.lineWidth * 2, w - ctx.lineWidth * 4, h - ctx.lineWidth * 4);
}
