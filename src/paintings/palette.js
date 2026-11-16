// Couleurs communes aux tableaux.
export const NIGHT = '#0b1118';
export const NIGHT_2 = '#14202d';
export const PAPER = '#f4f1ea';
export const INK = '#1b1b1b';
export const GOLD = '#c9a24a';
export const CYAN = '#38d6ff';
export const MINT = '#7cffb2';
export const EMBER = '#e4572e';

export const TAU = Math.PI * 2;

export function fill(ctx, w, h, color) {
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
}
