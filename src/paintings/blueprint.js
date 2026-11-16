// Un site web tracé comme un plan d'architecte : les traits se dessinent peu à peu.
import { CYAN, MINT, NIGHT, NIGHT_2, fill } from './palette.js';

// Chaque segment : [x1, y1, x2, y2] en proportions du tableau.
const SEGMENTS = [
  // cadre du navigateur
  [0.12, 0.14, 0.88, 0.14], [0.88, 0.14, 0.88, 0.86], [0.88, 0.86, 0.12, 0.86], [0.12, 0.86, 0.12, 0.14],
  // barre du haut
  [0.12, 0.23, 0.88, 0.23],
  // titre
  [0.18, 0.34, 0.56, 0.34], [0.18, 0.41, 0.46, 0.41],
  // bouton
  [0.18, 0.48, 0.32, 0.48], [0.32, 0.48, 0.32, 0.55], [0.32, 0.55, 0.18, 0.55], [0.18, 0.55, 0.18, 0.48],
  // image
  [0.62, 0.3, 0.82, 0.3], [0.82, 0.3, 0.82, 0.56], [0.82, 0.56, 0.62, 0.56], [0.62, 0.56, 0.62, 0.3],
  [0.62, 0.3, 0.82, 0.56], [0.82, 0.3, 0.62, 0.56],
  // trois cartes
  [0.18, 0.64, 0.36, 0.64], [0.36, 0.64, 0.36, 0.79], [0.36, 0.79, 0.18, 0.79], [0.18, 0.79, 0.18, 0.64],
  [0.41, 0.64, 0.59, 0.64], [0.59, 0.64, 0.59, 0.79], [0.59, 0.79, 0.41, 0.79], [0.41, 0.79, 0.41, 0.64],
  [0.64, 0.64, 0.82, 0.64], [0.82, 0.64, 0.82, 0.79], [0.82, 0.79, 0.64, 0.79], [0.64, 0.79, 0.64, 0.64],
];

export function draw(ctx, w, h, t) {
  fill(ctx, w, h, NIGHT);
  const unit = Math.min(w, h);

  // quadrillage
  ctx.strokeStyle = NIGHT_2;
  ctx.lineWidth = 1;
  const gap = unit / 12;
  ctx.beginPath();
  for (let x = gap; x < w; x += gap) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = gap; y < h; y += gap) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  // à l'arrêt (t = 0) le plan est complet ; sinon il se trace en boucle
  const progress = t <= 0 ? 1 : Math.min(1, (t % 10) / 6.5);
  const drawn = progress * SEGMENTS.length;

  ctx.strokeStyle = CYAN;
  ctx.lineWidth = Math.max(1.5, unit * 0.007);
  ctx.lineCap = 'round';
  SEGMENTS.forEach(([x1, y1, x2, y2], i) => {
    const part = Math.max(0, Math.min(1, drawn - i));
    if (part <= 0) return;
    ctx.beginPath();
    ctx.moveTo(x1 * w, y1 * h);
    ctx.lineTo((x1 + (x2 - x1) * part) * w, (y1 + (y2 - y1) * part) * h);
    ctx.stroke();
  });

  // la pointe du crayon
  const tip = Math.min(SEGMENTS.length - 1, Math.floor(drawn));
  if (progress < 1) {
    const [x1, y1, x2, y2] = SEGMENTS[tip];
    const part = drawn - tip;
    ctx.fillStyle = MINT;
    ctx.beginPath();
    ctx.arc((x1 + (x2 - x1) * part) * w, (y1 + (y2 - y1) * part) * h, unit * 0.014, 0, Math.PI * 2);
    ctx.fill();
  }

  // trois points de la barre du navigateur
  ctx.fillStyle = CYAN;
  ctx.globalAlpha = progress > 0.2 ? 1 : 0;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(w * (0.16 + i * 0.03), h * 0.185, unit * 0.009, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
