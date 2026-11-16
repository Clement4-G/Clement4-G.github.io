// La galerie en 3D : on s'y promène librement. Quatre salles, chacune avec son ambiance,
// des chefs-d'œuvre détournés aux murs, des portes qui s'ouvrent à l'approche, six pièces
// d'échecs à trouver et une salle secrète. Rendu léger : pas d'ombres, pas de post-traitement.
import {
  AmbientLight,
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Fog,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Raycaster,
  RepeatWrapping,
  SRGBColorSpace,
  Scene,
  SphereGeometry,
  TextureLoader,
  Vector2,
  WebGLRenderer,
} from 'three';
import { localize } from '../content.js';
import { createPainting } from '../paintings/index.js';
import { artUrl, overlayEnvelope, texUrl } from '../paintings/works.js';
import { buildExtras } from './extras.js';
import { GARDEN_OBSTACLES, GARDEN_THEME, buildGarden } from './garden.js';
import { buildProps } from './props.js';
import { createQualityGovernor } from './quality.js';
import { piecePlaces } from './quest.js';
import { EYE, PAINTING_Y, ROOM_DEPTH, ROOM_WIDTH, paintingPlace } from './tour.js';
import { DOOR_W, Z_START, arcFor, avoidObstacles, buildWorld, doorOpening, driveStep, facingPainting, lookDelta, moveWalker, roomIndexAt, zoneAt } from './walk.js';

const WALL_H = 4.5;
const DOOR_H = 3;
const SERIF = "'Iowan Old Style', Palatino, Georgia, serif";

// Une ambiance par salle : salon de lecture, nuit étoilée, salle de marché, studio, atelier d'horloger.
// real : texture photographique (CC0, Poly Haven) qui remplace le sol dessiné une fois chargée ; tint la colore.
const HALL = { wall: '#c79a6b', partition: '#5a3d28', ceiling: '#ead9bd', fog: '#e6d6ba', floor: 'planks', real: 'herringbone_parquet', tint: '#e2c39c', wallReal: 'dark_wooden_planks', wallTint: '#d6a878', kind: 'hall' };
const THEMES = {
  ia: { wall: '#18213d', partition: '#121a33', ceiling: '#080d1f', fog: '#0c1228', floor: 'night', real: 'granite_tile', tint: '#5b6fc0', kind: 'night' },
  trading: { wall: '#1c222b', partition: '#161b22', ceiling: '#0f1318', fog: '#141920', floor: 'night', real: 'granite_tile', tint: '#6a727e', kind: 'market' },
  stack: { wall: '#f3f2ec', partition: '#e6e4dc', ceiling: '#ffffff', fog: '#f2f1ea', floor: 'planks', real: 'herringbone_parquet', tint: '#f3e6d0', kind: 'studio' },
  apropos: { wall: '#2f5145', partition: '#27443a', ceiling: '#efe4cf', fog: '#d6cab1', floor: 'planks', real: 'herringbone_parquet', tint: '#d9bf9c', kind: 'horloger' },
};
const SECRET = { wall: '#0d0d10', partition: '#0d0d10', ceiling: '#050506', fog: '#060608', floor: 'royal', real: 'granite_tile', tint: '#a8842f', kind: 'secret' };

function canvasOf(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// Les sols : dessinés en code, répétés en dalles.
const FLOORS = {
  night(ctx, s) {
    ctx.fillStyle = '#141c38';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#0e1530';
    ctx.fillRect(0, 0, s / 2, s / 2);
    ctx.fillRect(s / 2, s / 2, s / 2, s / 2);
    ctx.fillStyle = '#f0c860';
    for (const [x, y] of [[0.25, 0.25], [0.75, 0.75]]) {
      ctx.beginPath();
      ctx.arc(x * s, y * s, s * 0.012, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  planks(ctx, s) {
    const tones = ['#9a6b43', '#8c5f3a', '#a5764c', '#93643f'];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = tones[i];
      ctx.fillRect((i * s) / 4, 0, s / 4, s);
      ctx.fillStyle = 'rgba(40, 22, 10, 0.55)';
      ctx.fillRect((i * s) / 4, 0, s * 0.008, s);
      ctx.fillRect((i * s) / 4, ((i * 37) % 100) * 0.01 * s, s / 4, s * 0.008);
    }
  },
  royal(ctx, s) {
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#b08a3c';
    ctx.fillRect(0, 0, s / 2, s / 2);
    ctx.fillRect(s / 2, s / 2, s / 2, s / 2);
  },
};

function drawPlaque(canvas, number, title) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0b1118';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#c9a24a';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#c9a24a';
  // chiffres « droits » : avec une police à chiffres anciens, « 02 » se lisait « ϙ2 »
  ctx.font = "600 104px 'Segoe UI', system-ui, -apple-system, sans-serif";
  ctx.fillText(number, 46, canvas.height / 2 + 6);
  ctx.fillStyle = '#f4f1ea';
  let size = 76;
  do {
    ctx.font = `400 ${size}px ${SERIF}`;
    size -= 4;
  } while (ctx.measureText(title).width > canvas.width - 260 && size > 30);
  ctx.fillText(title, 220, canvas.height / 2 + 4);
}

function drawLabel(canvas, title, sub) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0b1118';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#c9a24a';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
  ctx.fillStyle = '#f4f1ea';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  let size = 54;
  do {
    ctx.font = `400 ${size}px ${SERIF}`;
    size -= 3;
  } while (ctx.measureText(title).width > canvas.width - 60 && size > 22);
  ctx.fillText(title, canvas.width / 2, sub ? canvas.height * 0.34 : canvas.height / 2 + 3);
  if (!sub) return;
  // seconde ligne : l'œuvre détournée, son artiste, sa date
  ctx.fillStyle = '#c9a24a';
  size = 34;
  do {
    ctx.font = `italic 400 ${size}px ${SERIF}`;
    size -= 2;
  } while (ctx.measureText(sub).width > canvas.width - 50 && size > 16);
  ctx.fillText(sub, canvas.width / 2, canvas.height * 0.72);
}

export function mountGallery(canvas, content, handlers, { lang = 'fr', reducedMotion = false, quest = null, look: lookSettings = {} } = {}) {
  let look = lookSettings;
  const rooms = content.rooms;
  const count = rooms.length;
  let world = buildWorld(count, { secretOpen: Boolean(quest?.complete) });

  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const governor = createQualityGovernor();
  let quality = 1.5;
  const applyPixelRatio = () => renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality));
  applyPixelRatio();
  const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new Scene();
  const air = new Color(HALL.fog);
  const airTarget = new Color(HALL.fog);
  scene.background = air;
  scene.fog = new Fog(air, 14, 44);
  const camera = new PerspectiveCamera(62, 1, 0.1, 90);
  camera.rotation.order = 'YXZ';

  scene.add(new AmbientLight('#ffffff', 1.75));
  const sun = new DirectionalLight('#fff4dc', 1.7);
  sun.position.set(3, 6, 4);
  scene.add(sun);

  const disposables = [];
  // le chargeur de textures et son cache existent avant toute matière qui s'en sert
  const loader = new TextureLoader();
  const texCache = new Map();
  let disposed = false;
  const keep = (thing) => {
    disposables.push(thing);
    return thing;
  };
  const lambert = (color) => keep(new MeshLambertMaterial({ color }));
  const inkMat = lambert('#1b1b1b');
  realTexture('wood_table_001', 1, 1, inkMat, '#2b2724', 1.25);
  const goldMat = keep(new MeshLambertMaterial({ color: '#d9ad4e', emissive: '#5a430f' }));
  const lightMat = keep(new MeshBasicMaterial({ color: '#ffffff' }));

  // un mur arrête les clics : on ne vise jamais ce qui se trouve derrière
  const wall = (mesh) => {
    mesh.userData.wall = true;
    return mesh;
  };

  function add(geometry, material, x, y, z, rotY = 0, rotX = 0, parent = scene) {
    const mesh = new Mesh(keep(geometry), material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rotX, rotY, 0);
    parent.add(mesh);
    return mesh;
  }

  function texture(draw, width, height) {
    const cv = canvasOf(width, height);
    draw(cv.getContext('2d'), width, height);
    const tex = keep(new CanvasTexture(cv));
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }

  // un point rond et doux, pour les étoiles et les poussières
  const dotTex = texture((ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }, 64, 64);

  // les textures photographiques arrivent après coup ; en cas d'échec, le dessin en code reste
  // chaque image n'est chargée qu'une fois ; chaque matière en reçoit sa propre copie réglée
  function realTexture(id, repeatX, repeatY, material, tint, gain = 1) {
    if (!texCache.has(id)) texCache.set(id, new Promise((resolve, reject) => loader.load(texUrl(id), resolve, undefined, reject)));
    texCache
      .get(id)
      .then((base) => {
        if (disposed) return;
        const tex = keep(base.clone());
        tex.wrapS = RepeatWrapping;
        tex.wrapT = RepeatWrapping;
        tex.repeat.set(repeatX, repeatY);
        tex.colorSpace = SRGBColorSpace;
        tex.anisotropy = maxAnisotropy;
        tex.needsUpdate = true;
        material.map = tex;
        material.color.set(tint).multiplyScalar(gain); // gain : compense une photo plus sombre que la teinte voulue
        material.needsUpdate = true;
      })
      .catch(() => console.warn('Texture non chargée, couleur unie conservée', id));
  }

  function points(n, color, size, spread, parent) {
    const data = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = ((i * 137.5) % 360) * (Math.PI / 180);
      const r = spread.r * Math.sqrt(((i * 53) % 97) / 97);
      data[i * 3] = Math.cos(a) * r;
      data[i * 3 + 1] = spread.y0 + (((i * 31) % 89) / 89) * (spread.y1 - spread.y0);
      data[i * 3 + 2] = Math.sin(a) * r;
    }
    const geometry = keep(new BufferGeometry());
    geometry.setAttribute('position', new Float32BufferAttribute(data, 3));
    const cloud = new Points(geometry, keep(new PointsMaterial({ color, size: size * 1.3, map: dotTex, alphaTest: 0.2, sizeAttenuation: true, transparent: true, opacity: 0.9 })));
    parent.add(cloud);
    return cloud;
  }

  // --- le bâtiment : un hall d'accueil, les salles en enfilade, la salle secrète ---
  const segments = [{ from: Z_START, to: 0, theme: HALL }];
  rooms.forEach((room, i) => segments.push({ from: -(i * ROOM_DEPTH), to: -((i + 1) * ROOM_DEPTH), theme: THEMES[room.id] || HALL }));
  segments.push({ from: world.hallEnd, to: world.zEnd, theme: SECRET });
  const floorMeshes = [];

  for (const seg of segments) {
    const depth = seg.from - seg.to;
    const mid = (seg.from + seg.to) / 2;
    const t = seg.theme;
    const floorTex = texture((ctx, s) => FLOORS[t.floor](ctx, s), 256, 256);
    floorTex.wrapS = RepeatWrapping;
    floorTex.wrapT = RepeatWrapping;
    floorTex.repeat.set(ROOM_WIDTH / 2, depth / 2);
    floorTex.anisotropy = maxAnisotropy;
    const floorMat = keep(new MeshLambertMaterial({ map: floorTex }));
    floorMeshes.push(add(new PlaneGeometry(ROOM_WIDTH, depth), floorMat, 0, 0, mid, 0, -Math.PI / 2));
    realTexture(t.real, ROOM_WIDTH / 2.5, depth / 2.5, floorMat, t.tint);
    if (t.ceiling) {
      const ceilingMat = keep(new MeshBasicMaterial({ color: t.ceiling }));
      add(new PlaneGeometry(ROOM_WIDTH, depth), ceilingMat, 0, WALL_H, mid, 0, Math.PI / 2);
      realTexture('white_plaster_02', 3, depth / 3.3, ceilingMat, t.ceiling, 1.5);
    }
    const wallMat = lambert(t.wall);
    if (t.wallReal) realTexture(t.wallReal, depth / 4, WALL_H / 4, wallMat, t.wallTint, 1.5);
    else realTexture('white_plaster_02', depth / 3, WALL_H / 3, wallMat, t.wall, 1.55);
    const gate = t.kind === 'market' ? world.garden : null;
    if (gate) {
      // le mur ouest de la salle 2 est percé par la porte du jardin
      const before = seg.from - (gate.doorZ + gate.doorHalf);
      const after = gate.doorZ - gate.doorHalf - seg.to;
      wall(add(new PlaneGeometry(before, WALL_H), wallMat, -ROOM_WIDTH / 2, WALL_H / 2, seg.from - before / 2, Math.PI / 2));
      wall(add(new PlaneGeometry(after, WALL_H), wallMat, -ROOM_WIDTH / 2, WALL_H / 2, seg.to + after / 2, Math.PI / 2));
      wall(add(new PlaneGeometry(gate.doorHalf * 2, WALL_H - 3), wallMat, -ROOM_WIDTH / 2, 3 + (WALL_H - 3) / 2, gate.doorZ, Math.PI / 2));
      // la plinthe s'interrompt devant la porte du jardin
      add(new BoxGeometry(0.05, 0.09, before), inkMat, -ROOM_WIDTH / 2 + 0.025, 0.045, seg.from - before / 2);
      add(new BoxGeometry(0.05, 0.09, after), inkMat, -ROOM_WIDTH / 2 + 0.025, 0.045, seg.to + after / 2);
    } else {
      wall(add(new PlaneGeometry(depth, WALL_H), wallMat, -ROOM_WIDTH / 2, WALL_H / 2, mid, Math.PI / 2));
      add(new BoxGeometry(0.05, 0.09, depth), inkMat, -ROOM_WIDTH / 2 + 0.025, 0.045, mid);
    }
    wall(add(new PlaneGeometry(depth, WALL_H), wallMat, ROOM_WIDTH / 2, WALL_H / 2, mid, -Math.PI / 2));
    add(new BoxGeometry(0.05, 0.09, depth), inkMat, ROOM_WIDTH / 2 - 0.025, 0.045, mid);

    // le décor vivant de la salle : il ne s'anime que lorsque le visiteur s'y trouve
    const decor = new Group();
    decor.position.set(0, 0, mid);
    scene.add(decor);
    seg.animate = () => {};
    if (t.kind === 'hall' || t.kind === 'studio' || t.kind === 'horloger') {
      add(new PlaneGeometry(5, 1.4), lightMat, 0, WALL_H - 0.01, 0, 0, Math.PI / 2, decor);
    }
    if (t.kind === 'night') {
      const stars = points(240, '#f0c860', 0.07, { r: 4.3, y0: 2.7, y1: 4.4 }, decor);
      const dust = points(120, '#9db8ff', 0.045, { r: 4.3, y0: 2.3, y1: 4.3 }, decor);
      seg.animate = (time) => {
        stars.rotation.y = time * 0.05;
        dust.rotation.y = -time * 0.03;
        stars.material.opacity = 0.75 + 0.25 * Math.sin(time * 1.7);
      };
    }
    if (t.kind === 'market') {
      // le bandeau de cours qui défile en haut des murs : des valeurs fictives
      const tickerTex = texture((ctx, w, h) => {
        ctx.fillStyle = '#07090c';
        ctx.fillRect(0, 0, w, h);
        ctx.font = "700 46px 'Cascadia Mono', Consolas, 'Courier New', monospace";
        ctx.textBaseline = 'middle';
        ['ALPHA ▲ 0,42', 'BETA ▼ 0,18', 'GAMMA ▲ 1,07', 'DELTA ▼ 0,63', 'OMEGA ▲ 0,25', 'SIGMA ▲ 0,09'].forEach((item, i) => {
          ctx.fillStyle = item.includes('▲') ? '#5ef2b0' : '#ff6b5e';
          ctx.fillText(item, 20 + i * 340, h / 2 + 2);
        });
      }, 2048, 96);
      tickerTex.wrapS = RepeatWrapping;
      tickerTex.repeat.set(1.5, 1);
      const tickerMat = keep(new MeshBasicMaterial({ map: tickerTex }));
      add(new PlaneGeometry(depth, 0.5), tickerMat, -ROOM_WIDTH / 2 + 0.03, WALL_H - 0.4, 0, Math.PI / 2, 0, decor);
      add(new PlaneGeometry(depth, 0.5), tickerMat, ROOM_WIDTH / 2 - 0.03, WALL_H - 0.4, 0, -Math.PI / 2, 0, decor);
      for (const z of [-3.6, 0, 3.6]) add(new PlaneGeometry(4.2, 0.22), lightMat, 0, WALL_H - 0.01, z, 0, Math.PI / 2, decor);
      seg.animate = (time) => {
        tickerTex.offset.x = time * 0.025;
      };
    }
    if (t.kind === 'horloger') {
      // de grands rouages tournent aux murs de l'atelier
      const gearTex = texture((ctx, s) => {
        const c = s / 2;
        ctx.clearRect(0, 0, s, s);
        ctx.fillStyle = '#d9ad4e';
        ctx.beginPath();
        const teeth = 14;
        for (let i = 0; i < teeth * 2; i++) {
          const a = (i / (teeth * 2)) * Math.PI * 2;
          const r = i % 2 ? c * 0.98 : c * 0.82;
          for (const da of [-0.06, 0.06]) ctx.lineTo(c + Math.cos(a + da) * r, c + Math.sin(a + da) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(c + Math.cos(a) * c * 0.48, c + Math.sin(a) * c * 0.48, c * 0.17, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(c, c, c * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }, 256, 256);
      const gearMat = keep(new MeshBasicMaterial({ map: gearTex, transparent: true, alphaTest: 0.3 }));
      const gears = [[-1, 3.0, -2.2, 0.95, 1], [-1, 3.75, -3.7, 0.55, -1.73], [1, 3.1, 3.8, 1.0, 1], [1, 3.8, 2.3, 0.6, -1.67], [1, 2.35, 2.45, 0.45, 2.2]].map(([side, y, z, r, ratio]) => {
        const gear = add(new PlaneGeometry(r * 2, r * 2), gearMat, side * (ROOM_WIDTH / 2 - 0.04), y, z, -side * (Math.PI / 2), 0, decor);
        gear.userData.ratio = ratio;
        return gear;
      });
      const dust = points(120, '#f0c860', 0.04, { r: 4.3, y0: 2.3, y1: 4.2 }, decor);
      seg.animate = (time) => {
        for (const gear of gears) gear.rotation.z = time * 0.35 * gear.userData.ratio;
        dust.rotation.y = time * 0.03;
      };
    }
    if (t.kind === 'secret') {
      const sparks = points(200, '#f0c860', 0.05, { r: 4.2, y0: 2.3, y1: 4.3 }, decor);
      // le roi, sur son socle, au centre de la salle
      const king = new Group();
      const part = (geometry, y) => add(geometry, goldMat, 0, y, 0, 0, 0, king);
      part(new CylinderGeometry(0.34, 0.4, 0.14, 20), 0.07);
      part(new CylinderGeometry(0.14, 0.3, 0.9, 20), 0.59);
      part(new CylinderGeometry(0.24, 0.16, 0.16, 20), 1.1);
      part(new BoxGeometry(0.08, 0.34, 0.08), 1.34);
      part(new BoxGeometry(0.24, 0.08, 0.08), 1.38);
      king.position.set(0, 0.9, 0);
      decor.add(king);
      add(new CylinderGeometry(0.7, 0.8, 0.9, 24), lambert('#17171c'), 0, 0.45, 0, 0, 0, decor);
      seg.animate = (time) => {
        sparks.rotation.y = time * 0.06;
        king.rotation.y = time * 0.5;
      };
    }
  }
  wall(add(new PlaneGeometry(ROOM_WIDTH, WALL_H), lambert(HALL.wall), 0, WALL_H / 2, Z_START, Math.PI));
  wall(add(new PlaneGeometry(ROOM_WIDTH, WALL_H), lambert(SECRET.wall), 0, WALL_H / 2, world.zEnd, 0));

  // --- le jardin, attenant à la salle 2 ---
  let gardenIndex = -1;
  if (world.garden) {
    const garden = buildGarden({ add, keep, lambert, points, realTexture });
    scene.add(garden.root);
    gardenIndex = segments.length;
    segments.push({ theme: GARDEN_THEME, animate: garden.animate });
  }

  // --- cloisons, portes coulissantes et plaques de salle ---
  const plaques = [];
  const doors = [];
  const sideW = (ROOM_WIDTH - DOOR_W) / 2;
  const doorMat = lambert('#20242b');
  realTexture('wood_table_001', 1, 2, doorMat, '#3a3f47', 1.3);
  world.partitions.forEach((partition, i) => {
    const z = partition.z;
    const room = rooms[i] || null;
    const partitionColor = (room ? THEMES[room.id] || HALL : SECRET).partition;
    const mat = lambert(partitionColor);
    realTexture('white_plaster_02', 2, 1.5, mat, partitionColor, 1.55);
    wall(add(new BoxGeometry(sideW, WALL_H, 0.3), mat, -(DOOR_W / 2 + sideW / 2), WALL_H / 2, z));
    wall(add(new BoxGeometry(sideW, WALL_H, 0.3), mat, DOOR_W / 2 + sideW / 2, WALL_H / 2, z));
    wall(add(new BoxGeometry(DOOR_W, WALL_H - DOOR_H, 0.3), mat, 0, DOOR_H + (WALL_H - DOOR_H) / 2, z));
    add(new BoxGeometry(DOOR_W + 0.24, 0.08, 0.36), goldMat, 0, DOOR_H + 0.04, z);
    const plaqueCanvas = canvasOf(1024, 256);
    const tex = keep(new CanvasTexture(plaqueCanvas));
    tex.colorSpace = SRGBColorSpace;
    add(new PlaneGeometry(2.4, 0.6), keep(new MeshBasicMaterial({ map: tex })), 0, DOOR_H + 0.5, z + 0.16);
    plaques.push({ room, canvas: plaqueCanvas, texture: tex });
    const leaves = [-1, 1].map((side) => {
      const leaf = wall(add(new BoxGeometry(DOOR_W / 2, DOOR_H, 0.08), room ? doorMat : inkMat, (side * DOOR_W) / 4, DOOR_H / 2, z));
      add(new BoxGeometry(0.05, DOOR_H * 0.82, 0.1), goldMat, (-side * DOOR_W) / 4 + side * 0.09, 0, 0, 0, 0, leaf);
      leaf.userData.side = side;
      return leaf;
    });
    doors.push({ partition, leaves, open: 0 });
  });

  function drawPlaques(l) {
    for (const p of plaques) {
      if (p.room) drawPlaque(p.canvas, p.room.number, localize(p.room.title, l));
      else drawPlaque(p.canvas, content.secret.number, localize(content.secret.title, l));
      p.texture.needsUpdate = true;
    }
  }

  // --- les tableaux : un chef-d'œuvre détourné par cadre, à ses proportions ---
  const paintings = [];
  function hang(id, roomIndex, base, normal) {
    const data = content.paintings[id];
    const aspect = data.work ? data.work.w / data.work.h : 640 / 440;
    // au plus 1,70 m de haut : le cartel tient toujours au-dessus de la plinthe
    const width = Math.min(3, 1.7 * aspect);
    const height = width / aspect;
    const artCanvas = aspect >= 1 ? canvasOf(768, Math.round(768 / aspect)) : canvasOf(Math.round(768 * aspect), 768);
    const tex = keep(new CanvasTexture(artCanvas));
    tex.anisotropy = maxAnisotropy;
    tex.colorSpace = SRGBColorSpace;
    const record = { id, roomIndex, texture: tex, clean: false, hasImage: false, offset: paintings.length * 3.5, x: base.x, z: base.z, normal };
    record.painting = createPainting(data.art, artCanvas, {
      reducedMotion,
      work: data.work ? data.work.image : null,
      onImage: () => {
        record.hasImage = true;
        record.clean = false;
        tex.needsUpdate = true;
      },
    });
    record.painting.load();
    record.painting.drawStill();
    const rotY = Math.atan2(normal.x, normal.z);
    const at = (k) => [base.x + normal.x * k, base.z + normal.z * k];
    const place = (geometry, material, k, y) => {
      const [x, z] = at(k);
      return add(geometry, material, x, y, z, rotY);
    };
    // une applique de laiton éclaire le tableau, accroché à même le mur
    place(new BoxGeometry(width * 0.45, 0.05, 0.16), goldMat, 0.17, PAINTING_Y + height / 2 + 0.3);
    place(new BoxGeometry(0.04, 0.2, 0.04), goldMat, 0.06, PAINTING_Y + height / 2 + 0.24);
    place(new BoxGeometry(width + 0.3, height + 0.3, 0.1), inkMat, 0.02, PAINTING_Y);
    place(new BoxGeometry(width + 0.12, height + 0.12, 0.11), goldMat, 0.025, PAINTING_Y);
    record.mesh = place(new PlaneGeometry(width, height), keep(new MeshBasicMaterial({ map: tex })), 0.09, PAINTING_Y);
    record.mesh.userData.paintingId = id;
    // le cartel sous le cadre : le nom du projet
    record.labelCanvas = canvasOf(768, 176);
    record.labelTexture = keep(new CanvasTexture(record.labelCanvas));
    record.labelTexture.colorSpace = SRGBColorSpace;
    place(new PlaneGeometry(1.9, 0.44), keep(new MeshBasicMaterial({ map: record.labelTexture })), 0.03, PAINTING_Y - height / 2 - 0.42);
    paintings.push(record);
  }
  rooms.forEach((room, i) => {
    room.paintings.forEach((id, j) => {
      const p = paintingPlace(i, j);
      hang(id, i, { x: p.x, z: p.z }, { x: -p.side, z: 0 });
    });
  });
  hang(content.secret.painting, count, { x: 0, z: world.zEnd + 0.06 }, { x: 0, z: 1 });
  const pictureMeshes = paintings.map((p) => p.mesh);
  const paintingPlaces = paintings.map((p) => ({ id: p.id, x: p.x, z: p.z, roomIndex: p.roomIndex }));

  function drawLabels(l) {
    for (const p of paintings) {
      const work = content.paintings[p.id].work;
      const sub = work ? `${localize(work.title, l)} · ${localize(work.artist, l)}, ${localize(work.year, l)}` : '';
      drawLabel(p.labelCanvas, localize(content.paintings[p.id].title, l), sub);
      p.labelTexture.needsUpdate = true;
    }
  }
  drawPlaques(lang);
  drawLabels(lang);

  // --- les six pièces d'échecs cachées ---
  const HEADS = {
    pion: () => new SphereGeometry(0.09, 14, 10),
    'pion-2': () => new SphereGeometry(0.09, 14, 10),
    cavalier: () => new BoxGeometry(0.1, 0.2, 0.22),
    fou: () => new ConeGeometry(0.09, 0.24, 14),
    tour: () => new CylinderGeometry(0.12, 0.12, 0.14, 14),
    dame: () => new SphereGeometry(0.12, 14, 10),
  };
  const haloMat = keep(new MeshBasicMaterial({ color: '#f0c860', transparent: true, opacity: 0.35, depthWrite: false }));
  const pieces = piecePlaces(count).map((place, i) => {
    const group = new Group();
    const part = (geometry, y) => {
      const mesh = add(geometry, goldMat, 0, y, 0, 0, 0, group);
      mesh.userData.pieceId = place.id;
      return mesh;
    };
    part(new CylinderGeometry(0.15, 0.17, 0.07, 16), 0.035);
    part(new CylinderGeometry(0.06, 0.13, 0.32, 16), 0.23);
    part((HEADS[place.id] || HEADS.pion)(), 0.47).rotation.x = place.id === 'cavalier' ? -0.5 : 0;
    group.position.set(place.x, 0.75, place.z);
    scene.add(group);
    const halo = add(new CircleGeometry(0.42, 24), haloMat, place.x, 0.02, place.z, 0, -Math.PI / 2);
    const visible = !quest || !quest.has(place.id);
    group.visible = visible;
    halo.visible = visible;
    return { ...place, group, halo, phase: i * 1.1 };
  });
  const pieceMeshes = pieces.flatMap((p) => p.group.children);

  // --- les curiosités : des objets avec lesquels jouer ---
  const props = [...buildProps({ scene, keep, count, lang, gardenSegment: gardenIndex, realTexture }), ...buildExtras({ scene, keep, count, lang, content, realTexture })];
  if (world.garden) {
    GARDEN_OBSTACLES.forEach((o, i) => props.push({ id: `volume-jardin-${i}`, decor: true, segment: gardenIndex, ...o, reach: 0, meshes: [], animate() {}, setLang() {}, interact: () => null }));
  }
  // listes calculées une fois : rien n'est recréé à chaque image
  const solidProps = props.filter((prop) => prop.radius);
  const placesByZone = new Map();
  for (const place of paintingPlaces) {
    if (!placesByZone.has(place.roomIndex)) placesByZone.set(place.roomIndex, []);
    placesByZone.get(place.roomIndex).push(place);
  }
  const wallMeshes = [];
  scene.traverse((node) => {
    if (node.isMesh && node.userData.wall) wallMeshes.push(node);
  });
  const pickTargets = [...pictureMeshes, ...pieceMeshes, ...props.flatMap((p) => p.meshes), ...floorMeshes, ...wallMeshes];

  // --- état de la visite ---
  const pos = { x: 0, z: Z_START - 3 };
  const vel = { x: 0, z: 0 };
  let yaw = 0;
  let pitch = 0;
  let auto = null; // déplacement guidé : { x, z, yaw }
  let wheelPush = 0;
  let stride = 0;
  const keys = new Set();
  let running = false;
  let paused = false;
  let pausedDrawn = false;
  let startedAt = 0;
  let frameId = null;
  let lastTime = 0;
  let lastPaint = 0;
  let lastRoom = null;
  let lastFacing = null;
  let lastProgress = -1;
  let lastPick = 0;
  let facing = null; // ce que le visiteur regarde : { kind: 'painting' | 'prop', id, prop }
  let clock = 0;
  let eyeNow = EYE;
  let shakeUntil = 0;
  let driving = null; // la voiture dans laquelle le visiteur est monté
  let carSpeed = 0;
  let inside = null; // le tableau dans lequel le visiteur est entré : { record, start, until, look }
  let insideCooldown = 0;
  let failed = false;

  function fail(error) {
    if (failed) return;
    failed = true;
    running = false;
    if (frameId !== null) cancelAnimationFrame(frameId);
    handlers.onFatal(error);
  }

  const segmentAt = (z) => (gardenIndex >= 0 && pos.x < -ROOM_WIDTH / 2 ? gardenIndex : z >= 0 ? 0 : 1 + Math.min(count, Math.floor(-z / ROOM_DEPTH)));

  function collect(piece) {
    if (!quest || !quest.collect(piece.id)) return;
    piece.group.visible = false;
    piece.halo.visible = false;
    if (quest.complete) {
      world = buildWorld(count, { secretOpen: true });
      doors[doors.length - 1].partition = world.partitions[world.partitions.length - 1];
    }
    handlers.onPiece?.(piece.id);
  }

  // les objets ont un volume : on glisse autour
  function pushOut(p) {
    return avoidObstacles(p, driving ? solidProps.filter((prop) => prop !== driving) : solidProps, world);
  }

  function useProp(prop) {
    const effect = prop.interact() || '';
    if (effect === 'rev') shakeUntil = clock + 1.1;
    if (effect === 'drive') {
      // monter ou descendre : la voiture reste là où on la laisse
      driving = driving ? null : prop;
      carSpeed = 0;
      auto = null;
      lastFacing = '';
    }
    if (effect.startsWith('goto:')) travelTo(effect.slice(5));
    if (effect.startsWith('panel:')) handlers.onOpenPainting(effect.slice(6));
    handlers.onProp?.(prop.id, effect, prop.counts !== false, Boolean(driving));
  }

  function travelTo(id) {
    const pose = stopPose(id);
    if (!pose) return;
    driving = null;
    const p = paintings.find((entry) => entry.id === id);
    // dans une autre salle, on s'y transporte ; dans la même, on s'en approche
    // depuis un autre lieu (hall et jardin compris), on s'y transporte : pas de glissade à travers un mur
    if (p.roomIndex !== zoneAt(pos, count) || reducedMotion) {
      pos.x = pose.x;
      pos.z = pose.z;
      yaw = pose.yaw;
      pitch = 0;
      air.set(segments[segmentAt(pos.z)].theme.fog);
      auto = null;
    } else auto = pose;
  }

  // --- entrer dans un tableau : l'œuvre devient un décor courbe où l'on flotte quelques secondes ---
  function enterPainting(record) {
    const work = content.paintings[record.id].work;
    if (!work || record.noWorld) return;
    const begin = () => {
      record.world.visible = true;
      inside = { record, start: clock, until: clock + 10, look: 0, tilt: 0 };
      auto = null;
      keys.clear();
      scene.fog.near = 900;
      scene.fog.far = 1000;
      handlers.onInside?.(record.id);
    };
    if (record.world) {
      begin();
      return;
    }
    if (record.loadingWorld) return;
    record.loadingWorld = true;
    loader.load(
      artUrl(work.image),
      (tex) => {
        if (disposed) {
          tex.dispose();
          return;
        }
        keep(tex);
        tex.colorSpace = SRGBColorSpace;
        tex.wrapS = RepeatWrapping;
        tex.repeat.x = -1; // vue de l'intérieur du cylindre, l'image serait en miroir
        const theta = arcFor(work.w / work.h);
        const group = new Group();
        group.position.set(0, 300 + paintings.indexOf(record) * 40, 0);
        const wall = new Mesh(keep(new CylinderGeometry(9, 9, 13, 64, 1, true, Math.PI - theta / 2, theta)), keep(new MeshBasicMaterial({ map: tex, side: BackSide, fog: false })));
        group.add(wall);
        const motes = points(160, '#f0c860', 0.06, { r: 7, y0: -5, y1: 5 }, group);
        motes.material.fog = false;
        record.motes = motes;
        scene.add(group);
        record.world = group;
        // le visiteur est peut-être déjà reparti pendant le chargement
        if (Math.hypot(record.x - pos.x, record.z - pos.z) < 2) begin();
        else group.visible = false;
      },
      undefined,
      () => {
        record.noWorld = true;
      },
    );
  }

  function leavePainting() {
    if (!inside) return;
    const { record } = inside;
    record.world.visible = false;
    inside = null;
    insideCooldown = clock + 3;
    scene.fog.near = 14;
    scene.fog.far = 44;
    pos.x = record.x + record.normal.x * 2.4;
    pos.z = record.z + record.normal.z * 2.4;
    yaw = Math.atan2(record.normal.x, record.normal.z);
    pitch = 0;
    vel.x = 0;
    vel.z = 0;
    air.set(segments[segmentAt(pos.z)].theme.fog);
    handlers.onInside?.(null);
  }

  function activate() {
    if (inside) {
      leavePainting();
      return;
    }
    if (!facing) return;
    if (facing.kind === 'prop') useProp(facing.prop);
    else handlers.onOpenPainting(facing.id);
  }

  function findFacing() {
    if (inside) return null;
    if (driving) return { kind: 'prop', id: driving.id, prop: driving, out: true };
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const here = segmentAt(pos.z);
    let best = null;
    let bestDist = Infinity;
    for (const prop of props) {
      // seulement les objets du lieu où l'on se trouve : pas d'action à travers un mur
      if (prop.decor || prop.segment !== here) continue;
      const dx = prop.x - pos.x;
      const dz = prop.z - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > prop.reach || dist >= bestDist) continue;
      if (dist > 0.6 && (dx * fx + dz * fz) / dist < 0.3) continue;
      best = prop;
      bestDist = dist;
    }
    if (best) return { kind: 'prop', id: best.id, prop: best };
    // seuls les tableaux du lieu où l'on se trouve : pas de regard à travers une cloison
    const zone = zoneAt(pos, count);
    const id = facingPainting(pos, yaw, placesByZone.get(zone) || []);
    return id ? { kind: 'painting', id } : null;
  }

  function shortestTurn(from, to) {
    let d = (to - from) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function update(dt, now) {
    const s = dt / 1000;
    const time = now / 1000;
    clock = time;
    let speed = 0;

    if (inside) {
      // dans le tableau : on avance lentement vers l'œuvre, on peut tourner la tête
      const k = Math.min(1, (time - inside.start) / 10);
      const group = inside.record.world;
      camera.position.set(group.position.x, group.position.y + (reducedMotion ? 0 : Math.sin(time * 0.5) * 0.25), -k * 4.5);
      camera.rotation.set(inside.tilt, inside.look, 0);
      if (!reducedMotion && inside.record.motes) inside.record.motes.rotation.y = time * 0.08;
      air.set('#0b1118');
      scene.fog.color.copy(air);
      if (time > inside.until) leavePainting();
      return;
    }

    if (driving && !paused && !auto) {
      const throttle = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const steer = (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) - (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0);
      const car = driveStep({ speed: carSpeed, yaw }, { throttle, steer }, s);
      carSpeed = car.speed;
      yaw = car.yaw;
      const fx = -Math.sin(yaw);
      const fz = -Math.cos(yaw);
      const wanted = Math.abs(carSpeed * s);
      const next = pushOut(moveWalker(pos, fx * carSpeed * s, fz * carSpeed * s, world));
      // un mur arrête net la voiture
      if (wanted > 0.001 && Math.hypot(next.x - pos.x, next.z - pos.z) < wanted * 0.3) carSpeed *= 0.2;
      pos.x = next.x;
      pos.z = next.z;
      driving.x = pos.x;
      driving.z = pos.z;
      driving.segment = segmentAt(pos.z);
      driving.group.position.set(pos.x + fx * 0.45, 0, pos.z + fz * 0.45);
      driving.group.rotation.y = yaw + Math.PI / 2;
    } else if (auto) {
      const dx = auto.x - pos.x;
      const dz = auto.z - pos.z;
      const dist = Math.hypot(dx, dz);
      const step = reducedMotion ? dist : Math.min(dist, 6 * s);
      if (auto.free) {
        // marche vers un point cliqué : les murs comptent
        const next = dist > 0.05 ? pushOut(moveWalker(pos, (dx / dist) * step, (dz / dist) * step, world)) : pos;
        const stuck = Math.hypot(next.x - pos.x, next.z - pos.z) < step * 0.2;
        pos.x = next.x;
        pos.z = next.z;
        speed = stuck ? 0 : 1;
        if (dist < 0.1 || stuck) auto = null;
      } else {
        if (dist > 0.001) {
          pos.x += (dx / dist) * step;
          pos.z += (dz / dist) * step;
        }
        const turn = shortestTurn(yaw, auto.yaw);
        yaw += reducedMotion ? turn : turn * Math.min(1, s * 5);
        pitch += (0 - pitch) * Math.min(1, s * 5);
        speed = dist > 0.05 ? 1 : 0;
        if (dist < 0.03 && Math.abs(turn) < 0.01) auto = null;
      }
    } else if (!paused) {
      const forward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const strafe = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
      const turn = (keys.has('ArrowLeft') ? 1 : 0) - (keys.has('ArrowRight') ? 1 : 0);
      yaw += turn * 2 * s;
      const pace = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 6.5 : 3.8;
      const fx = -Math.sin(yaw);
      const fz = -Math.cos(yaw);
      const rx = Math.cos(yaw);
      const rz = -Math.sin(yaw);
      const push = forward * pace + wheelPush;
      wheelPush *= Math.max(0, 1 - s * 5);
      const k = Math.min(1, s * 10);
      vel.x += (fx * push + rx * strafe * pace - vel.x) * k;
      vel.z += (fz * push + rz * strafe * pace - vel.z) * k;
      const next = pushOut(moveWalker(pos, vel.x * s, vel.z * s, world));
      speed = Math.min(1, Math.hypot(next.x - pos.x, next.z - pos.z) / (3.8 * s || 1));
      pos.x = next.x;
      pos.z = next.z;
    }

    stride += speed * s * 9;
    const bob = reducedMotion ? 0 : Math.sin(stride) * 0.035 * speed;
    eyeNow += ((driving ? 1.05 : EYE) - eyeNow) * (reducedMotion ? 1 : Math.min(1, s * 2.5));
    const shake = !reducedMotion && time < shakeUntil ? Math.sin(time * 75) * 0.012 : 0;
    camera.position.set(pos.x, eyeNow + bob * (eyeNow / EYE) + shake, pos.z);
    camera.rotation.set(pitch, yaw, shake * 0.6);

    const index = roomIndexAt(pos.z, count);
    const roomId = pos.x < -ROOM_WIDTH / 2 ? 'jardin' : pos.z >= 0 ? 'hall' : rooms[index] ? rooms[index].id : 'secret';
    if (roomId !== lastRoom) {
      lastRoom = roomId;
      handlers.onRoomChange?.(roomId);
    }
    const progress = Math.min(1, Math.max(0, (Z_START - pos.z) / (Z_START - world.zEnd)));
    if (Math.abs(progress - lastProgress) > 0.002) {
      lastProgress = progress;
      handlers.onProgress?.(progress);
    }

    // l'air de la salle : la couleur du fond glisse vers l'ambiance du lieu
    const active = segmentAt(pos.z);
    airTarget.set(segments[active].theme.fog);
    air.lerp(airTarget, reducedMotion ? 1 : Math.min(1, s * 2.2));
    scene.fog.color.copy(air); // le brouillard garde sa propre copie de la couleur : on la tient à jour
    if (!reducedMotion) segments[active].animate(time);
    // en animations réduites, le décor reste immobile ; les objets à manipuler gardent leur écran vivant
    for (const prop of props) if (prop.segment === active && (!reducedMotion || !prop.decor)) prop.animate(time, pos);

    for (const door of doors) {
      const target = door.partition.locked ? 0 : doorOpening(Math.abs(pos.z - door.partition.z));
      door.open += (target - door.open) * (reducedMotion ? 1 : Math.min(1, s * 5));
      for (const leaf of door.leaves) leaf.position.x = leaf.userData.side * (DOOR_W / 4 + door.open * (DOOR_W / 2) * 0.97);
    }

    for (const piece of pieces) {
      if (!piece.group.visible) continue;
      if (!reducedMotion) {
        piece.group.rotation.y = time * 1.4 + piece.phase;
        piece.group.position.y = 0.75 + 0.08 * Math.sin(time * 2 + piece.phase);
      }
      if (Math.hypot(piece.x - pos.x, piece.z - pos.z) < 1.05) collect(piece);
    }

    facing = paused ? null : findFacing();
    const facingKey = facing ? `${facing.kind}:${facing.id}:${facing.out ? 'out' : ''}` : null;
    if (facingKey !== lastFacing) {
      lastFacing = facingKey;
      handlers.onFacing?.(facing ? { kind: facing.kind, id: facing.id, title: facing.prop ? (facing.out ? facing.prop.titleOut : facing.prop.title) : null, bonus: Boolean(facing.prop?.bonus) } : null);
    }

    // marcher dans un cadre fait entrer dans le tableau
    if (!driving && !auto && !paused && time > insideCooldown) {
      for (const p of paintings) {
        if (p.roomIndex !== zoneAt(pos, count)) continue;
        const depth = (pos.x - p.x) * p.normal.x + (pos.z - p.z) * p.normal.z;
        const side = Math.abs((pos.x - p.x) * p.normal.z - (pos.z - p.z) * p.normal.x);
        if (depth < 0.95 && side < 0.9 && facing && facing.kind === 'painting' && facing.id === p.id) {
          enterPainting(p);
          break;
        }
      }
    }

    // seuls les tableaux de la salle courante s'animent, et seulement quand leur image change
    if (!reducedMotion && now - lastPaint > 66) {
      lastPaint = now;
      for (const p of paintings) {
        if (p.roomIndex !== zoneAt(pos, count)) continue;
        const t = time + p.offset;
        const quiet = p.hasImage && overlayEnvelope(t) === 0;
        if (quiet && p.clean) continue;
        p.painting.drawAt(t);
        p.texture.needsUpdate = true;
        p.clean = quiet;
      }
    }

    // les deux premières secondes (chargement des textures) ne comptent pas dans la mesure de fluidité
    const level = now - startedAt > 2000 ? governor.sample(dt) : quality;
    if (level !== quality) {
      quality = level;
      applyPixelRatio();
      resize();
    }
  }

  function frame(now) {
    if (!running) return;
    frameId = requestAnimationFrame(frame);
    // derrière un panneau ouvert, une seule image suffit : la boucle tourne à vide, la carte graphique se repose
    if (paused && pausedDrawn) {
      lastTime = now;
      return;
    }
    const dt = Math.min(100, now - lastTime || 16);
    lastTime = now;
    try {
      update(dt, now);
      renderer.render(scene, camera);
      if (paused) pausedDrawn = true;
    } catch (error) {
      fail(error);
    }
  }

  function resize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  // --- commandes ---
  let drag = null;
  let moved = false;
  const raycaster = new Raycaster();
  const pointer = new Vector2();

  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(pickTargets, false)[0];
    if (!hit) return null;
    const data = hit.object.userData;
    if (data.wall) return null;
    if (data.propId) {
      const prop = props.find((p) => p.id === data.propId);
      return !prop.decor && hit.distance < prop.reach + 2.5 ? { prop } : null;
    }
    if (data.paintingId) return hit.distance < 11 ? { painting: data.paintingId } : null;
    if (data.pieceId) {
      const piece = pieces.find((p) => p.id === data.pieceId);
      return piece.group.visible && hit.distance < 9 ? { piece } : null;
    }
    return hit.distance < 22 ? { floor: hit.point } : null;
  }

  function stopPose(id) {
    const p = paintings.find((entry) => entry.id === id);
    if (!p) return null;
    return { x: p.x + p.normal.x * 3.3, z: p.z + p.normal.z * 3.3, yaw: Math.atan2(p.normal.x, p.normal.z) };
  }

  function onWheel(event) {
    event.preventDefault();
    if (paused) return;
    auto = null;
    wheelPush = Math.max(-9, Math.min(9, wheelPush - event.deltaY * 0.02));
  }
  function onPointerDown(event) {
    if (paused) return;
    drag = { x: event.clientX, y: event.clientY, yaw, pitch };
    moved = false;
  }
  function onPointerMove(event) {
    if (paused) return;
    if (!drag) {
      // au survol, une visée toutes les 80 ms suffit pour changer le curseur
      if (event.timeStamp - lastPick < 80) return;
      lastPick = event.timeStamp;
      const target = pick(event);
      canvas.style.cursor = target && !target.floor ? 'pointer' : 'grab';
      return;
    }
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 5) moved = true;
    if (!moved) return;
    if (inside) {
      inside.look = Math.max(-0.75, Math.min(0.75, inside.look + event.movementX * 0.003));
      inside.tilt = Math.max(-0.4, Math.min(0.4, inside.tilt - event.movementY * 0.003));
      return;
    }
    auto = null;
    const turn = lookDelta(dx, dy, look);
    yaw = drag.yaw + turn.yaw;
    pitch = Math.min(0.6, Math.max(-0.6, drag.pitch + turn.pitch));
  }
  function onPointerUp() {
    drag = null;
  }
  function onClick(event) {
    if (paused || moved || inside) return;
    const target = pick(event);
    if (!target) return;
    if (target.painting) handlers.onOpenPainting(target.painting);
    else if (target.piece) collect(target.piece);
    else if (target.prop) useProp(target.prop);
    else if (!driving) auto = { x: target.floor.x, z: target.floor.z, free: true };
  }
  const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
  function onKeyDown(event) {
    if (paused || !running) return;
    if (event.target instanceof HTMLInputElement) return; // les réglages gardent leurs flèches
    if (inside) {
      if (event.code === 'Escape' || event.code === 'KeyE' || event.code === 'Enter') leavePainting();
      return;
    }
    // sur un bouton, Entrée garde son rôle habituel ; les touches de marche, elles, marchent toujours
    const onControl = event.target instanceof HTMLElement && event.target !== canvas && Boolean(event.target.closest('button, a, input'));
    if (MOVE_KEYS.has(event.code)) {
      keys.add(event.code);
      auto = null;
      if (event.code.startsWith('Arrow')) event.preventDefault();
    } else if ((event.code === 'KeyE' || (event.code === 'Enter' && !onControl)) && facing) {
      event.preventDefault();
      activate();
    }
  }
  function onKeyUp(event) {
    keys.delete(event.code);
  }
  function onBlur() {
    keys.clear();
  }
  function onContextLost(event) {
    event.preventDefault();
    fail(new Error('contexte WebGL perdu'));
  }

  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('click', onClick);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  window.addEventListener('resize', resize);
  canvas.addEventListener('webglcontextlost', onContextLost);

  resize();
  camera.position.set(pos.x, EYE, pos.z);

  return {
    // inside : on arrive dans la salle demandée, juste passé sa porte ; sinon dans le hall d'accueil
    async enter(roomId, { indoors = true } = {}) {
      const index = Math.max(0, rooms.findIndex((room) => room.id === roomId));
      pos.x = 0;
      pos.z = indoors ? -(index * ROOM_DEPTH) - 1.8 : 3.5;
      driving = null;
      if (inside) leavePainting();
      vel.x = 0;
      vel.z = 0;
      yaw = 0;
      pitch = indoors ? 0 : 0.14; // depuis le hall, le regard se lève vers la plaque de la première salle
      auto = null;
      keys.clear();
      lastRoom = null;
      lastFacing = null;
      air.set(segments[segmentAt(pos.z)].theme.fog);
      resize();
      if (!running && !failed) {
        running = true;
        startedAt = performance.now();
        lastTime = 0;
        frameId = requestAnimationFrame(frame);
      }
    },
    async exit() {
      running = false;
      keys.clear();
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
    },
    goToPainting(id) {
      if (inside) leavePainting();
      travelTo(id);
    },
    curiosities: props.filter((p) => !p.decor && p.counts !== false).length,
    isDriving: () => Boolean(driving),
    activate,
    setLook(next) {
      look = next;
    },
    setPaused(value) {
      paused = value;
      pausedDrawn = false;
      drag = null;
      keys.clear();
    },
    setLang(next) {
      drawPlaques(next);
      drawLabels(next);
      for (const prop of props) prop.setLang(next);
    },
    resize,
    dispose() {
      disposed = true;
      running = false;
      if (frameId !== null) cancelAnimationFrame(frameId);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      for (const thing of disposables) thing.dispose();
      for (const pending of texCache.values()) pending.then((tex) => tex.dispose()).catch(() => {});
      renderer.dispose();
      renderer.forceContextLoss(); // rend tout de suite le contexte graphique au navigateur
    },
  };
}
