// Des agents qui se passent le travail : nœuds reliés par des flèches qui s'allument tour à tour.
import { CYAN, MINT, NIGHT, NIGHT_2, PAPER, TAU, fill } from './palette.js';

const NODES = [
  [0.14, 0.5],
  [0.36, 0.24],
  [0.36, 0.76],
  [0.62, 0.5],
  [0.86, 0.28],
  [0.86, 0.72],
];
const LINKS = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 3],
  [3, 4],
  [3, 5],
];

function arrow(ctx, ax, ay, bx, by, r, head) {
  const angle = Math.atan2(by - ay, bx - ax);
  const sx = ax + Math.cos(angle) * r;
  const sy = ay + Math.sin(angle) * r;
  const ex = bx - Math.cos(angle) * (r + head * 0.4);
  const ey = by - Math.sin(angle) * (r + head * 0.4);
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - Math.cos(angle - 0.45) * head, ey - Math.sin(angle - 0.45) * head);
  ctx.lineTo(ex - Math.cos(angle + 0.45) * head, ey - Math.sin(angle + 0.45) * head);
  ctx.closePath();
  ctx.fill();
  return [sx, sy, ex, ey];
}

export function draw(ctx, w, h, t) {
  fill(ctx, w, h, NIGHT);
  const unit = Math.min(w, h);
  const r = unit * 0.055;
  const head = unit * 0.03;

  // trame de points
  ctx.fillStyle = NIGHT_2;
  const gap = unit / 14;
  for (let y = gap; y < h; y += gap) {
    for (let x = gap; x < w; x += gap) ctx.fillRect(x, y, 2, 2);
  }

  const cycle = t * 0.7;
  const active = Math.floor(cycle) % LINKS.length;
  const progress = cycle % 1;

  LINKS.forEach(([a, b], i) => {
    const [ax, ay] = [NODES[a][0] * w, NODES[a][1] * h];
    const [bx, by] = [NODES[b][0] * w, NODES[b][1] * h];
    const on = i === active;
    ctx.globalAlpha = on ? 1 : 0.35;
    ctx.strokeStyle = on ? MINT : CYAN;
    ctx.fillStyle = on ? MINT : CYAN;
    ctx.lineWidth = Math.max(1.5, unit * (on ? 0.008 : 0.005));
    const [sx, sy, ex, ey] = arrow(ctx, ax, ay, bx, by, r, head);
    if (on) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = PAPER;
      ctx.beginPath();
      ctx.arc(sx + (ex - sx) * progress, sy + (ey - sy) * progress, unit * 0.014, 0, TAU);
      ctx.fill();
    }
  });

  NODES.forEach(([nx, ny], i) => {
    const x = nx * w;
    const y = ny * h;
    const lit = LINKS[active].includes(i);
    ctx.globalAlpha = 1;
    ctx.fillStyle = NIGHT;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.lineWidth = Math.max(2, unit * 0.008);
    ctx.strokeStyle = lit ? MINT : CYAN;
    ctx.stroke();
    if (lit) {
      ctx.globalAlpha = 0.22 + 0.18 * Math.sin(t * 6);
      ctx.fillStyle = MINT;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.7, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = lit ? MINT : CYAN;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.32, 0, TAU);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}
