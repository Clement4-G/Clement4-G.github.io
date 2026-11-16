// Le jardin japonais : une cour à ciel ouvert où l'on se promène, attenante à la salle 2.
// Bassin et pont rouge, lanterne de pierre, pergola de glycines, arbre en fleurs, pavillon.
import { BoxGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, Group, MeshBasicMaterial, PlaneGeometry, SphereGeometry } from 'three';
import { GARDEN } from './walk.js';

// Volumes invisibles du jardin : le bassin (le pont, lui, se traverse), la lanterne,
// le tronc de l'arbre, les poteaux de la pergola et du pavillon, la table basse.
const POND_X = -10.4;
export const GARDEN_OBSTACLES = [
  ...[-1, 1].flatMap((side) => [
    { x: POND_X, z: GARDEN.doorZ + side * 1.45, radius: 0.45 },
    { x: POND_X - 1.0, z: GARDEN.doorZ + side * 1.2, radius: 0.45 },
    { x: POND_X + 1.0, z: GARDEN.doorZ + side * 1.2, radius: 0.45 },
    { x: POND_X - 1.6, z: GARDEN.doorZ + side * 0.9, radius: 0.3 },
    { x: POND_X + 1.6, z: GARDEN.doorZ + side * 0.9, radius: 0.3 },
  ]),
  { x: -7.6, z: GARDEN.zMax - 3, radius: 0.35 },
  { x: -12.8, z: GARDEN.zMax - 2.8, radius: 0.25 },
  ...[0, 1, 2, 3].map((i) => ({ x: -16 + i * 2.95, z: GARDEN.zMax - 1, radius: 0.1 })),
  ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ x: -15 + sx * 1.55, z: GARDEN.doorZ + 3 + sz * 1.55, radius: 0.1 }))),
  { x: -14.3, z: GARDEN.doorZ + 3.9, radius: 0.35 },
];

export const GARDEN_THEME = { fog: '#2b3060' };
const WALL_H = 4.6;

// kit : les outils de la scène (add, keep, lambert, points, realTexture).
export function buildGarden({ add, keep, lambert, points, realTexture }) {
  const g = GARDEN;
  const root = new Group();
  const width = -5 - g.xMin;
  const depth = g.zMax - g.zMin;
  const cx = (g.xMin - 5) / 2;
  const cz = (g.zMin + g.zMax) / 2;
  const put = (geometry, material, x, y, z, rotY = 0, rotX = 0, parent = root) => add(geometry, material, x, y, z, rotY, rotX, parent);

  const wood = lambert('#3b2616');
  realTexture('wood_table_001', 1, 1, wood, '#6a4a31', 1.2);
  const red = lambert('#a8281f');
  realTexture('wood_table_001', 1, 1, red, '#c8362b', 1.3);
  const stone = lambert('#8d949b');
  realTexture('japanese_stone_wall', 1, 1, stone, '#aab0b6', 1.5);
  const plaster = lambert('#efe6d2');
  realTexture('white_plaster_02', 3, 1.5, plaster, '#efe6d2', 1.55);

  // le sol : herbe, puis un chemin de pas japonais
  const grass = lambert('#6fae4f');
  put(new PlaneGeometry(width, depth), grass, cx, 0, cz, 0, -Math.PI / 2);
  realTexture('leafy_grass', width / 3, depth / 3, grass, '#d6ecb4');
  const steps = [[-6.1, g.doorZ], [-7.1, g.doorZ + 0.15], [-8.0, g.doorZ - 0.1], [-12.9, g.doorZ + 0.2], [-13.6, g.doorZ + 1.0], [-14.1, g.doorZ + 1.9]];
  for (const [x, z] of steps) put(new CylinderGeometry(0.42, 0.45, 0.06, 9), stone, x, 0.03, z);

  // les murs de la cour : crépi clair, soubassement et faîtage de bois sombre
  const wall = (length, x, z, rotY) => {
    put(new PlaneGeometry(length, WALL_H), plaster, x, WALL_H / 2, z, rotY).userData.wall = true;
    const along = Math.abs(Math.sin(rotY)) > 0.5;
    const band = (y, h) => put(new BoxGeometry(along ? 0.1 : length, h, along ? length : 0.1), wood, x, y, z);
    band(0.3, 0.6);
    band(WALL_H - 0.12, 0.24);
  };
  wall(width, cx, g.zMax, Math.PI);
  wall(width, cx, g.zMin, 0);
  wall(depth, g.xMin, cz, Math.PI / 2);
  // le mur du musée, côté jardin, percé par la porte
  const north = g.zMax - (g.doorZ + g.doorHalf);
  const south = g.doorZ - g.doorHalf - g.zMin;
  wall(north, g.xMax, g.zMax - north / 2, -Math.PI / 2);
  wall(south, g.xMax, g.zMin + south / 2, -Math.PI / 2);
  put(new PlaneGeometry(g.doorHalf * 2, WALL_H - 3), plaster, g.xMax, 3 + (WALL_H - 3) / 2, g.doorZ, -Math.PI / 2);
  // l'embrasure et son cadre de bois
  for (const side of [-1, 1]) {
    put(new PlaneGeometry(0.34, 3), plaster, -5.15, 1.5, g.doorZ + side * g.doorHalf, side > 0 ? Math.PI : 0);
    put(new BoxGeometry(0.5, 3.1, 0.14), wood, -5.15, 1.55, g.doorZ + side * (g.doorHalf + 0.05));
  }
  put(new BoxGeometry(0.5, 0.16, g.doorHalf * 2 + 0.4), wood, -5.15, 3.08, g.doorZ);
  put(new PlaneGeometry(0.34, g.doorHalf * 2), plaster, -5.15, 3, g.doorZ, 0, Math.PI / 2);

  // le bassin, ses nénuphars, ses carpes
  const pondX = POND_X;
  put(new CircleGeometry(2, 40), keep(new MeshBasicMaterial({ color: '#27506b' })), pondX, 0.02, g.doorZ, 0, -Math.PI / 2);
  put(new CircleGeometry(2.15, 40), stone, pondX, 0.012, g.doorZ, 0, -Math.PI / 2);
  for (const [x, z, r] of [[-1.1, 1.2, 0.26], [0.9, -1.25, 0.2], [1.3, 1.1, 0.16]]) put(new CircleGeometry(r, 14), lambert('#4f9440'), pondX + x, 0.03, g.doorZ + z, 0, -Math.PI / 2);
  const koiMat = lambert('#e8742c');
  const koi = [0, 1, 2].map((i) => put(new BoxGeometry(0.34, 0.03, 0.1), i === 1 ? lambert('#f4ecd8') : koiMat, pondX, 0.035, g.doorZ));

  // le pont rouge : un tablier bas entre deux rambardes
  put(new BoxGeometry(4.5, 0.1, 1.35), wood, pondX, 0.07, g.doorZ);
  for (const side of [-1, 1]) {
    put(new BoxGeometry(4.5, 0.07, 0.07), red, pondX, 0.85, g.doorZ + side * 0.66);
    put(new BoxGeometry(4.5, 0.05, 0.05), red, pondX, 0.5, g.doorZ + side * 0.66);
    for (let i = 0; i < 5; i++) put(new BoxGeometry(0.09, 0.95, 0.09), red, pondX - 2.1 + i * 1.05, 0.5, g.doorZ + side * 0.66);
  }

  // la lanterne de pierre
  const lanternX = -7.6;
  const lanternZ = g.zMax - 3;
  put(new CylinderGeometry(0.34, 0.4, 0.16, 8), stone, lanternX, 0.08, lanternZ);
  put(new CylinderGeometry(0.12, 0.14, 0.8, 8), stone, lanternX, 0.56, lanternZ);
  put(new BoxGeometry(0.5, 0.08, 0.5), stone, lanternX, 1.0, lanternZ);
  const glow = keep(new MeshBasicMaterial({ color: '#ffbe5a' }));
  put(new BoxGeometry(0.3, 0.3, 0.3), glow, lanternX, 1.19, lanternZ);
  put(new ConeGeometry(0.46, 0.34, 4), stone, lanternX, 1.52, lanternZ, Math.PI / 4);

  // l'arbre en fleurs
  const treeX = -12.8;
  const treeZ = g.zMax - 2.8;
  put(new CylinderGeometry(0.14, 0.22, 2.1, 8), wood, treeX, 1.05, treeZ);
  const blossom = lambert('#f3b8d0');
  const blossomDark = lambert('#e495b8');
  for (const [x, y, z, r] of [[0, 2.6, 0, 1.05], [0.8, 2.3, 0.3, 0.75], [-0.75, 2.35, -0.2, 0.8], [0.2, 3.2, -0.3, 0.7], [-0.3, 2.2, 0.75, 0.6]]) {
    put(new SphereGeometry(r, 12, 10), r > 0.74 ? blossom : blossomDark, treeX + x, y, treeZ + z);
  }

  // la pergola de glycines, le long du mur nord
  const pergolaZ = g.zMax - 1;
  put(new BoxGeometry(9, 0.12, 0.12), wood, -11.6, 2.9, pergolaZ);
  put(new BoxGeometry(9, 0.1, 0.1), wood, -11.6, 2.9, pergolaZ + 0.7);
  for (let i = 0; i < 4; i++) {
    put(new BoxGeometry(0.12, 2.9, 0.12), wood, -16 + i * 2.95, 1.45, pergolaZ);
    put(new BoxGeometry(0.1, 0.1, 0.9), wood, -16 + i * 2.95, 2.98, pergolaZ + 0.35);
  }
  const bloom = [lambert('#b58cff'), lambert('#8f6ae0'), lambert('#d2b8ff')];
  const beadGeometry = keep(new SphereGeometry(1, 8, 6));
  const chains = [];
  for (let i = 0; i < 16; i++) {
    const chain = new Group();
    chain.position.set(-15.8 + i * 0.56, 2.86, pergolaZ + (i % 2) * 0.7);
    const beads = 4 + (i % 3);
    for (let k = 0; k < beads; k++) {
      const bead = add(beadGeometry, bloom[(i + k) % 3], 0, -0.16 - k * 0.2, 0, 0, 0, chain);
      bead.scale.setScalar(0.13 * (1 - k / (beads + 1)));
    }
    root.add(chain);
    chains.push(chain);
  }

  // le pavillon : une estrade, quatre poteaux, un toit à quatre pans
  const pavX = -15;
  const pavZ = g.doorZ + 3;
  put(new BoxGeometry(3.4, 0.16, 3.4), wood, pavX, 0.08, pavZ);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(new BoxGeometry(0.16, 2.7, 0.16), wood, pavX + sx * 1.55, 1.5, pavZ + sz * 1.55);
  const roof = lambert('#2a3038');
  realTexture('grey_roof_01', 4, 2, roof, '#59616b', 1.3);
  put(new ConeGeometry(2.9, 1.25, 4), roof, pavX, 3.45, pavZ, Math.PI / 4);
  put(new BoxGeometry(3.7, 0.1, 3.7), wood, pavX, 2.84, pavZ);
  put(new BoxGeometry(0.8, 0.05, 0.5), wood, pavX + 0.7, 0.58, pavZ + 0.9);
  for (const lx of [-0.32, 0.32]) put(new BoxGeometry(0.05, 0.42, 0.42), wood, pavX + 0.7 + lx, 0.37, pavZ + 0.9);

  // la lune, les pétales qui tombent, les lucioles
  put(new SphereGeometry(2.4, 20, 14), keep(new MeshBasicMaterial({ color: '#fdf3d0', fog: false })), -34, 24, -34);
  const petals = points(170, '#e9c9ff', 0.06, { r: 5.6, y0: 0.4, y1: 4.6 }, root);
  petals.position.set(cx, 0, cz);
  const fireflies = points(46, '#f7f29a', 0.05, { r: 5.2, y0: 0.5, y1: 2.2 }, root);
  fireflies.position.set(cx, 0, cz);

  return {
    root,
    pavilion: { x: pavX, z: pavZ },
    animate(time) {
      koi.forEach((fish, i) => {
        const a = time * (0.5 + i * 0.13) + i * 2.1;
        const r = 0.8 + i * 0.38;
        fish.position.set(pondX + Math.cos(a) * r, 0.035, g.doorZ + Math.sin(a) * r);
        fish.rotation.y = -a - Math.PI / 2;
      });
      chains.forEach((chain, i) => {
        chain.rotation.z = 0.12 * Math.sin(time * 0.9 + i * 0.7);
        chain.rotation.x = 0.06 * Math.sin(time * 0.7 + i);
      });
      petals.rotation.y = time * 0.04;
      petals.position.y = -((time * 0.18) % 0.8);
      fireflies.rotation.y = -time * 0.07;
      fireflies.position.y = 0.2 * Math.sin(time * 0.6);
      glow.color.setRGB(1, 0.72 + 0.08 * Math.sin(time * 5), 0.34);
    },
  };
}
