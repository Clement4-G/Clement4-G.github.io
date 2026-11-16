// Plan du musée dans un repère de 1000 × 600. Les salles se suivent dans le sens des aiguilles d'une montre.

export const MAP_W = 1000;
export const MAP_H = 600;

export const ROOM_LAYOUT = {
  ia: { x: 70, y: 60, w: 370, h: 200 },
  trading: { x: 560, y: 60, w: 370, h: 200 },
  stack: { x: 560, y: 340, w: 370, h: 200 },
  apropos: { x: 70, y: 340, w: 370, h: 200 },
};

// Le jardin, attenant à la salle de trading : une zone sans tableau.
export const GARDEN_BOX = { x: 985, y: 90, w: 210, h: 140 };

export const ROOM_LINKS = [
  ['ia', 'trading'],
  ['trading', 'stack'],
  ['stack', 'apropos'],
];

const MIN_SCALE = 0.6;
const MAX_SCALE = 2.5;

// Borne le zoom et le déplacement : la carte ne sort jamais entièrement de l'écran.
export function clampView({ x, y, scale }) {
  const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
  const limitX = Math.min(MAP_W, (MAP_W / 2) * s);
  const limitY = Math.min(MAP_H, (MAP_H / 2) * s);
  return {
    x: Math.min(limitX, Math.max(-limitX, x)),
    y: Math.min(limitY, Math.max(-limitY, y)),
    scale: s,
  };
}

// Points de départ et d'arrivée d'une flèche entre deux salles voisines.
export function linkPoints(fromId, toId) {
  const a = ROOM_LAYOUT[fromId];
  const b = ROOM_LAYOUT[toId];
  const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  const bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  if (Math.abs(bc.x - ac.x) >= Math.abs(bc.y - ac.y)) {
    const dir = Math.sign(bc.x - ac.x);
    return { x1: ac.x + (dir * a.w) / 2 + dir * 10, y1: ac.y, x2: bc.x - (dir * b.w) / 2 - dir * 16, y2: bc.y };
  }
  const dir = Math.sign(bc.y - ac.y);
  return { x1: ac.x, y1: ac.y + (dir * a.h) / 2 + dir * 10, x2: bc.x, y2: bc.y - (dir * b.h) / 2 - dir * 16 };
}

// Ouvertures dans les murs d'une salle : une porte de 52 unités là où passe chaque flèche.
export function doorGaps(roomId) {
  const box = ROOM_LAYOUT[roomId];
  if (!box) return [];
  const half = 26;
  const gaps = [];
  for (const [from, to] of ROOM_LINKS) {
    if (from !== roomId && to !== roomId) continue;
    const p = linkPoints(from, to);
    const horizontal = p.y1 === p.y2;
    if (horizontal) {
      // la flèche part vers la droite ou la gauche : la porte est sur le mur de ce côté
      const leavesRight = (from === roomId) === p.x2 > p.x1;
      const x = leavesRight ? box.x + box.w : box.x;
      gaps.push({ x1: x, y1: p.y1 - half, x2: x, y2: p.y1 + half });
    } else {
      const leavesDown = (from === roomId) === p.y2 > p.y1;
      const y = leavesDown ? box.y + box.h : box.y;
      gaps.push({ x1: p.x1 - half, y1: y, x2: p.x1 + half, y2: y });
    }
  }
  return gaps;
}

// Étiquette du jardin sur deux lignes (« ✿ Jardin japonais » puis « bonus ») pour tenir dans son cadre.
export function gardenLines(number, title) {
  const [head, ...rest] = String(title).split(' · ');
  return [`${number} ${head}`.trim(), ...(rest.length ? [rest.join(' · ')] : [])];
}
