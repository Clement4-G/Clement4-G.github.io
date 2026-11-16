// Les chefs-d'œuvre détournés : un vrai tableau du domaine public, puis, par-dessus,
// une animation qui le transforme en projet. L'œuvre reste seule une partie du temps.

const CYAN = '#38d6ff';
const MINT = '#5ef2b0';
const GOLD = '#f0c860';
const CORAL = '#ff6b5e';
const NIGHT = '#0b1118';

const TAU = Math.PI * 2;
const frac = (v) => v - Math.floor(v);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// miniature légère, pour la carte du musée
export function thumbUrl(slug) {
  const base = (import.meta.env && import.meta.env.BASE_URL) || '/';
  return `${base}art/thumb/${slug}.jpg`;
}

export function texUrl(id) {
  const base = (import.meta.env && import.meta.env.BASE_URL) || '/';
  return `${base}tex/${id}.jpg`;
}

export function artUrl(slug) {
  const base = (import.meta.env && import.meta.env.BASE_URL) || '/';
  return `${base}art/${slug}.jpg`;
}

// 0 : l'œuvre seule. 1 : le détournement complet. Cycle de 14 secondes.
export function overlayEnvelope(t) {
  const u = ((t % 14) + 14) % 14;
  if (u < 5) return 0;
  if (u < 7) return (u - 5) / 2;
  if (u < 12) return 1;
  return (14 - u) / 2;
}

function line(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}

function dot(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

// La Grande Vague : l'écume devient un graphique en chandeliers.
function greatWave(ctx, w, h, t, lt) {
  const n = 24;
  const shown = Math.min(n, Math.floor((lt / 4.5) * n));
  const price = (i) => {
    const u = i / (n - 1);
    return h * (0.74 - 0.5 * Math.exp(-((u - 0.34) ** 2) / 0.035) - 0.08 * Math.sin(u * 9) - 0.1 * u);
  };
  const closes = [];
  ctx.lineWidth = Math.max(1.5, w / 320);
  for (let i = 0; i < shown; i++) {
    const x = w * (0.06 + (0.88 * i) / (n - 1));
    const open = price(i - 1 < 0 ? 0 : i - 1);
    const close = price(i);
    const up = close < open;
    ctx.strokeStyle = ctx.fillStyle = up ? MINT : CORAL;
    line(ctx, [[x, Math.min(open, close) - h * 0.035], [x, Math.max(open, close) + h * 0.035]]);
    const top = Math.min(open, close);
    ctx.fillRect(x - w * 0.011, top, w * 0.022, Math.max(3, Math.abs(close - open)));
    closes.push([x, close]);
  }
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = Math.max(2, w / 260);
  if (closes.length > 1) line(ctx, closes);
  else {
    ctx.beginPath();
    ctx.stroke();
  }
}

// La Nuit étoilée : les étoiles deviennent des agents reliés qui s'échangent des messages.
const STARS = [[0.1, 0.1], [0.2, 0.33], [0.3, 0.08], [0.41, 0.2], [0.52, 0.42], [0.6, 0.1], [0.72, 0.3], [0.88, 0.14], [0.36, 0.5]];
const STAR_LINKS = [[0, 1], [1, 4], [2, 3], [3, 4], [4, 6], [5, 6], [6, 7], [4, 8], [0, 2], [5, 7]];
function starryNight(ctx, w, h, t) {
  ctx.lineWidth = Math.max(1.5, w / 400);
  ctx.strokeStyle = CYAN;
  STAR_LINKS.forEach(([a, b], i) => {
    const A = STARS[a];
    const B = STARS[b];
    line(ctx, [[A[0] * w, A[1] * h], [B[0] * w, B[1] * h]]);
    const k = frac(t * 0.3 + i * 0.173);
    ctx.fillStyle = MINT;
    dot(ctx, (A[0] + (B[0] - A[0]) * k) * w, (A[1] + (B[1] - A[1]) * k) * h, w / 130);
  });
  STARS.forEach(([x, y], i) => {
    ctx.fillStyle = NIGHT;
    dot(ctx, x * w, y * h, w / 55);
    ctx.fillStyle = GOLD;
    dot(ctx, x * w, y * h, w / 90 + (w / 300) * Math.sin(t * 2 + i));
    ctx.beginPath();
    ctx.arc(x * w, y * h, w / 55, 0, TAU);
    ctx.stroke();
  });
}

// L'Astronome : sur la carte accrochée au mur, un terminal ; du globe partent des ondes locales.
function astronomer(ctx, w, h, t, lt) {
  const x = w * 0.27;
  const y = h * 0.225;
  const tw = w * 0.25;
  const th = h * 0.2;
  ctx.fillStyle = NIGHT;
  ctx.fillRect(x, y, tw, th);
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = Math.max(1.5, w / 380);
  ctx.strokeRect(x, y, tw, th);
  const typed = Math.min(5, lt * 0.9);
  const widths = [0.7, 0.5, 0.82, 0.38, 0.6];
  widths.forEach((k, i) => {
    const grow = clamp01(typed - i);
    ctx.fillStyle = i % 2 ? MINT : CYAN;
    ctx.fillRect(x + tw * 0.09, y + th * (0.16 + i * 0.16), tw * 0.8 * k * grow, th * 0.07);
  });
  if (Math.floor(t * 2) % 2) {
    ctx.fillStyle = GOLD;
    ctx.fillRect(x + tw * 0.09, y + th * 0.86, tw * 0.07, th * 0.08);
  }
  ctx.strokeStyle = GOLD;
  for (let i = 0; i < 3; i++) {
    const k = frac(t * 0.25 + i / 3);
    ctx.globalAlpha *= 1 - k;
    ctx.beginPath();
    ctx.arc(w * 0.29, h * 0.52, w * (0.1 + 0.16 * k), 0, TAU);
    ctx.stroke();
    ctx.globalAlpha /= 1 - k || 1;
  }
}

// La Tour de Babel : les étages deviennent les couches d'une stack qui se charge.
function babel(ctx, w, h, t, lt) {
  const phase = Math.min(7, lt * 1.1);
  ctx.lineWidth = Math.max(1.5, w / 380);
  for (let k = 0; k < 5; k++) {
    const hw = w * (0.33 - k * 0.045);
    const cx = w * 0.46;
    const y = h * (0.78 - k * 0.135);
    const bh = h * 0.07;
    ctx.fillStyle = NIGHT;
    ctx.fillRect(cx - hw, y, hw * 2, bh);
    ctx.fillStyle = k % 2 ? MINT : CYAN;
    ctx.fillRect(cx - hw, y, hw * 2 * clamp01(phase - k), bh);
    ctx.strokeStyle = GOLD;
    ctx.strokeRect(cx - hw, y, hw * 2, bh);
  }
}

// La Naissance de Vénus : la scène devient la maquette d'un site qui se dessine.
function venus(ctx, w, h, t, lt) {
  const p = Math.min(6, lt * 1.1);
  ctx.lineWidth = Math.max(1.5, w / 380);
  ctx.strokeStyle = CYAN;
  const x = w * 0.08;
  const y = h * 0.08;
  const bw = w * 0.84;
  const bh = h * 0.84;
  ctx.strokeRect(x, y, bw, bh);
  line(ctx, [[x, y + bh * 0.1], [x + bw, y + bh * 0.1]]);
  ctx.fillStyle = GOLD;
  for (let i = 0; i < 3; i++) dot(ctx, x + bw * (0.03 + i * 0.03), y + bh * 0.05, bw * 0.008);
  ctx.setLineDash([w / 90, w / 90]);
  for (let i = 1; i < 4; i++) line(ctx, [[x + (bw * i) / 4, y + bh * 0.1], [x + (bw * i) / 4, y + bh]]);
  ctx.setLineDash([]);
  ctx.strokeStyle = MINT;
  const blocks = [[0.3, 0.16, 0.4, 0.5], [0.05, 0.72, 0.26, 0.22], [0.37, 0.72, 0.26, 0.22], [0.69, 0.72, 0.26, 0.22]];
  blocks.forEach(([bx, by, ww, hh], i) => {
    const k = clamp01(p - i);
    if (k > 0) ctx.strokeRect(x + bw * bx, y + bh * by, bw * ww * k, bh * hh);
  });
}

// Le Voyageur : la mer de nuages devient des courbes de niveau, le voyageur est cadré.
function wanderer(ctx, w, h, t) {
  ctx.lineWidth = Math.max(1.5, w / 380);
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = i % 2 ? CYAN : MINT;
    const points = [];
    for (let s = 0; s <= 40; s++) {
      const u = s / 40;
      points.push([u * w, h * (0.5 + i * 0.045) + h * 0.02 * Math.sin(u * 9 + t * 0.8 + i * 1.3)]);
    }
    line(ctx, points);
  }
  ctx.strokeStyle = GOLD;
  const cx = w * 0.5;
  const cy = h * 0.47;
  const s = w * (0.2 + 0.01 * Math.sin(t * 2));
  const c = s * 0.3;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    line(ctx, [[cx + sx * s, cy + sy * (s * 1.5 - c)], [cx + sx * s, cy + sy * s * 1.5], [cx + sx * (s - c), cy + sy * s * 1.5]]);
  }
}

// La Création d'Adam : entre les deux doigts, le signal passe.
function adam(ctx, w, h, t) {
  const x = w * 0.385;
  const y = h * 0.455;
  ctx.lineWidth = Math.max(1.5, w / 420);
  ctx.strokeStyle = CYAN;
  for (let i = 0; i < 3; i++) {
    const k = frac(t * 0.4 + i / 3);
    ctx.beginPath();
    ctx.arc(x, y, w * 0.012 + w * 0.09 * k, 0, TAU);
    ctx.stroke();
  }
  ctx.strokeStyle = GOLD;
  ctx.setLineDash([w / 70, w / 70]);
  ctx.lineDashOffset = -t * (w / 14);
  line(ctx, [[w * 0.2, h * 0.49], [x, y], [w * 0.56, h * 0.42]]);
  ctx.setLineDash([]);
  ctx.fillStyle = MINT;
  dot(ctx, x, y, w * 0.008 + w * 0.004 * Math.sin(t * 6));
}

// La Partie d'échecs : un échiquier se pose sur la scène et un cavalier trace son saut.
function chessGame(ctx, w, h, t) {
  const x0 = w * 0.27;
  const y0 = h * 0.7;
  const cell = w * 0.045;
  ctx.lineWidth = Math.max(1.5, w / 420);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2) continue;
      ctx.fillStyle = (r * 8 + c) % 3 ? CYAN : MINT;
      ctx.globalAlpha *= 0.28;
      ctx.fillRect(x0 + c * cell, y0 + r * cell * 0.42, cell, cell * 0.42);
      ctx.globalAlpha /= 0.28;
    }
  }
  ctx.strokeStyle = CYAN;
  ctx.strokeRect(x0, y0, cell * 8, cell * 8 * 0.6);
  const at = (c, r) => [x0 + (c + 0.5) * cell, y0 + (r + 0.5) * cell * 0.42];
  const path = [at(1, 6), at(1, 4), at(2, 4), at(2, 2), at(4, 2), at(4, 1)];
  const k = frac(t / 5) * (path.length - 1);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = Math.max(2.5, w / 240);
  line(ctx, path.slice(0, Math.floor(k) + 2));
  const i = Math.min(path.length - 2, Math.floor(k));
  const f = k - i;
  ctx.fillStyle = GOLD;
  dot(ctx, path[i][0] + (path[i + 1][0] - path[i][0]) * f, path[i][1] + (path[i + 1][1] - path[i][1]) * f, w / 70);
}

const OVERLAYS = {
  'great-wave': greatWave,
  'starry-night': starryNight,
  astronomer,
  babel,
  venus,
  wanderer,
  adam,
  'chess-game': chessGame,
};

export const WORK_IDS = Object.keys(OVERLAYS);

// Dessine l'œuvre (cadrée pour remplir le canvas), puis le détournement dosé par `mix`.
export function drawWork(ctx, w, h, t, image, slug, mix) {
  const scale = Math.max(w / image.width, h / image.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, 0, 0, w, h);
  if (mix <= 0) return;
  ctx.save();
  ctx.globalAlpha = 0.42 * mix;
  ctx.fillStyle = NIGHT;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = mix;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // lt : temps écoulé depuis l'apparition du détournement, pour rejouer la même mise en scène
  OVERLAYS[slug](ctx, w, h, t, Math.max(0, ((t % 14) + 14) % 14 - 5));
  ctx.restore();
}

const cache = new Map();

// Charge l'image d'une œuvre une seule fois. Rejette si elle est introuvable.
export function loadWorkImage(slug) {
  if (!cache.has(slug)) {
    cache.set(
      slug,
      new Promise((resolve, reject) => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => resolve(image);
        image.onerror = () => {
          cache.delete(slug); // une coupure passagère : la prochaine demande réessaie
          reject(new Error(`image introuvable : ${slug}`));
        };
        image.src = artUrl(slug);
      }),
    );
  }
  return cache.get(slug);
}
