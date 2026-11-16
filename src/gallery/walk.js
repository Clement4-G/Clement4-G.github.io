// La marche libre dans le musée : des fonctions pures, sans 3D.
// Le visiteur est un cercle qui glisse le long des murs et passe par les portes.
import { ROOM_DEPTH, ROOM_WIDTH } from './tour.js';

export const RADIUS = 0.45;
export const DOOR_W = 3;
export const SECRET_DEPTH = 10;
export const HALL_DEPTH = 6.5;
export const Z_START = HALL_DEPTH;
const HALF_WALL = 0.15;

export function buildWorld(roomCount, { secretOpen = false } = {}) {
  const hallEnd = -(roomCount * ROOM_DEPTH);
  const partitions = [];
  for (let i = 0; i < roomCount; i++) partitions.push({ z: -(i * ROOM_DEPTH), locked: false });
  partitions.push({ z: hallEnd, locked: !secretOpen });
  return { halfW: ROOM_WIDTH / 2, zStart: Z_START, hallEnd, zEnd: hallEnd - SECRET_DEPTH, partitions, doorHalf: DOOR_W / 2, garden: roomCount > 1 ? GARDEN : null };
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function partitionNear(world, z0, z1) {
  const lo = Math.min(z0, z1);
  const hi = Math.max(z0, z1);
  return world.partitions.find((p) => hi >= p.z - HALF_WALL - RADIUS && lo <= p.z + HALF_WALL + RADIUS);
}

// Le jardin : une cour à ciel ouvert, à l'ouest de la salle 2, où l'on entre par une porte.
export const GARDEN = { xMin: -17.3, xMax: -5.3, zMin: -ROOM_DEPTH - 11.4, zMax: -ROOM_DEPTH - 0.6, doorZ: -ROOM_DEPTH - 9, doorHalf: 1.2 };

export function moveWalker(pos, dx, dz, world) {
  const g = world.garden;
  const mainMin = -world.halfW + RADIUS;
  const mainMax = world.halfW - RADIUS;
  const EPS = 1e-9;
  const atDoor = g && Math.abs(pos.z - g.doorZ) <= g.doorHalf - RADIUS;
  // entre le bâtiment et le jardin, on n'est « dans la porte » qu'en face d'elle ; ailleurs, c'est le mur,
  // et quiconque s'y retrouve (poussé par un meuble) est ramené dans le bâtiment
  const zoneOf = (x) => (!g || x >= mainMin - EPS ? 'main' : x <= g.xMax - RADIUS + EPS ? 'garden' : atDoor ? 'door' : 'main');
  const from = zoneOf(pos.x);

  // d'abord de côté : le mur ouest ne se franchit que dans l'embrasure de la porte du jardin
  let lo = mainMin;
  let hi = mainMax;
  if (from === 'garden') {
    lo = g.xMin + RADIUS;
    hi = atDoor ? mainMax : g.xMax - RADIUS;
  } else if (from === 'door' || atDoor) lo = g.xMin + RADIUS;
  let x = clamp(pos.x + dx, lo, hi);
  // dans l'épaisseur d'une cloison, on reste entre les montants de sa porte
  const here = from === 'main' ? partitionNear(world, pos.z, pos.z) : null;
  if (here) {
    const gap = world.doorHalf - RADIUS;
    x = Math.abs(pos.x) <= gap ? clamp(x, -gap, gap) : pos.x;
  }

  // puis en profondeur, selon l'endroit où l'on se trouve
  const to = zoneOf(x);
  if (to === 'garden') return { x, z: clamp(pos.z + dz, g.zMin + RADIUS, g.zMax - RADIUS) };
  if (to === 'door') return { x, z: clamp(pos.z + dz, g.doorZ - g.doorHalf + RADIUS, g.doorZ + g.doorHalf - RADIUS) };
  // dans le bâtiment : une cloison ne se franchit que par sa porte ouverte
  let z = clamp(pos.z + dz, world.zEnd + RADIUS, world.zStart - RADIUS);
  const wall = partitionNear(world, pos.z, z);
  if (wall && wall !== here && (wall.locked || Math.abs(x) > world.doorHalf - RADIUS)) z = pos.z;
  if (wall && wall === here && wall.locked) {
    // collé à une porte fermée : on peut seulement s'en éloigner
    const away = Math.abs(z - wall.z) >= Math.abs(pos.z - wall.z) && Math.sign(z - wall.z) === Math.sign(pos.z - wall.z);
    if (!away) z = pos.z;
  }
  return { x, z };
}

// Où se trouve le visiteur : 'garden', ou le numéro de la salle.
export function zoneAt(pos, roomCount) {
  if (pos.x < -ROOM_WIDTH / 2) return 'garden';
  return pos.z >= 0 ? 'hall' : roomIndexAt(pos.z, roomCount);
}

// Écarte le visiteur des meubles (des cercles), puis le ramène dans les murs :
// une poussée ne fait jamais sortir du lieu où l'on est.
export function avoidObstacles(pos, obstacles, world) {
  let x = pos.x;
  let z = pos.z;
  for (const o of obstacles) {
    const dx = x - o.x;
    const dz = z - o.z;
    const dist = Math.hypot(dx, dz);
    const min = o.radius + 0.3;
    if (dist < min && dist > 0.0001) {
      x = o.x + (dx / dist) * min;
      z = o.z + (dz / dist) * min;
    }
  }
  return moveWalker({ x, z }, 0, 0, world);
}

export function roomIndexAt(z, roomCount) {
  if (z >= 0) return 0;
  return Math.min(roomCount, Math.floor(-z / ROOM_DEPTH));
}

// Le tableau que le visiteur regarde : proche, et à peu près dans l'axe du regard.
export function facingPainting(pos, yaw, places) {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  let best = null;
  let bestDot = Math.cos((35 * Math.PI) / 180);
  for (const place of places) {
    const dx = place.x - pos.x;
    const dz = place.z - pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 5.5 || dist === 0) continue;
    const dot = (dx * fx + dz * fz) / dist;
    if (dot > bestDot) {
      bestDot = dot;
      best = place.id;
    }
  }
  return best;
}

// Ouverture d'une porte coulissante selon la distance du visiteur : 0 fermée, 1 ouverte.
export function doorOpening(distance) {
  const k = clamp((5 - distance) / 3, 0, 1);
  return k * k * (3 - 2 * k);
}

// La petite voiture : elle accélère, plafonne, ralentit seule, et ne tourne qu'en roulant.
export function driveStep(car, input, dt) {
  const max = 9;
  const reverse = -3;
  let speed = car.speed;
  if (input.throttle > 0) speed = Math.min(max, speed + 6 * dt);
  else if (input.throttle < 0) speed = Math.max(reverse, speed - 7 * dt);
  else if (speed > 0) speed = Math.max(0, speed - 5 * dt);
  else speed = Math.min(0, speed + 5 * dt);
  const grip = clamp(speed / 4, -1, 1);
  return { speed, yaw: car.yaw + input.steer * 1.6 * dt * grip };
}

// Angle (en radians) du décor courbe dans lequel on entre quand on traverse un tableau.
export function arcFor(aspect) {
  return clamp((aspect * 13) / 9, 1, Math.PI);
}

// Position d'un agent sur sa boucle de patrouille après `t` secondes, et son cap.
export function patrolPoint(points, t, speed) {
  const lengths = points.map((p, i) => {
    const q = points[(i + 1) % points.length];
    return Math.hypot(q.x - p.x, q.z - p.z);
  });
  const total = lengths.reduce((a, b) => a + b, 0);
  let d = (((t * speed) % total) + total) % total;
  let i = 0;
  while (d > lengths[i] && i < points.length - 1) {
    d -= lengths[i];
    i += 1;
  }
  const p = points[i];
  const q = points[(i + 1) % points.length];
  const k = lengths[i] ? Math.min(1, d / lengths[i]) : 0;
  return { x: p.x + (q.x - p.x) * k, z: p.z + (q.z - p.z) * k, heading: Math.atan2(q.x - p.x, q.z - p.z) };
}

// Rotation du regard pour un déplacement de souris, selon les réglages du visiteur.
// Une sensibilité illisible revient à 1 ; elle reste entre 0,3 et 3.
export function lookDelta(dx, dy, settings = {}) {
  const raw = Number(settings.sensitivity);
  const sensitivity = Number.isFinite(raw) ? clamp(raw, 0.3, 3) : 1;
  return {
    yaw: dx * 0.004 * sensitivity * (settings.invertX ? -1 : 1),
    pitch: dy * 0.003 * sensitivity * (settings.invertY ? -1 : 1),
  };
}
