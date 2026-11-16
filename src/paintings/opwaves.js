// Op-art : des bandes qui ondulent comme des courbes de marché.
import { EMBER, INK, PAPER, fill } from './palette.js';

export function draw(ctx, w, h, t) {
  fill(ctx, w, h, PAPER);
  const bands = 22;
  const bandH = h / bands;
  const stepX = Math.max(4, w / 90);

  const offset = (x, row) => {
    const nx = x / w;
    const bulge = Math.exp(-((nx - 0.5) ** 2) * 9);
    return (
      Math.sin(nx * 9 + t * 0.9 + row * 0.35) * bandH * 0.9 * bulge +
      Math.sin(nx * 3.2 - t * 0.5) * bandH * 0.5
    );
  };

  ctx.fillStyle = INK;
  for (let row = 0; row < bands + 2; row += 2) {
    const top = (row - 1) * bandH;
    ctx.beginPath();
    for (let x = 0; x <= w + stepX; x += stepX) {
      const y = top + offset(x, row);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let x = w + stepX; x >= 0; x -= stepX) {
      ctx.lineTo(x, top + bandH + offset(x, row + 1));
    }
    ctx.closePath();
    ctx.fill();
  }

  // une seule courbe colorée traverse le tableau, comme un cours
  ctx.strokeStyle = EMBER;
  ctx.lineWidth = Math.max(2, bandH * 0.22);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let x = 0; x <= w + stepX; x += stepX) {
    const nx = x / w;
    const y = h * 0.62 - nx * h * 0.28 + Math.sin(nx * 14 + t * 1.3) * h * 0.05 + Math.sin(nx * 5 - t * 0.7) * h * 0.06;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}
