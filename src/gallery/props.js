// Les curiosités et le mobilier du musée. Les curiosités se manipulent (E ou clic) :
// un terminal d'IA hors ligne, un coffre de notes en vue graphe, un terminal de trading
// de démonstration, un katana, une peluche, la montre du lapin blanc, un avatar en relief.
// Le mobilier (bancs, tapis, plantes, fenêtre sur jardin) habille les salles. Tout est en code.
import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  PlaneGeometry,
  SRGBColorSpace,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { ROOM_DEPTH } from './tour.js';

const SERIF = "'Iowan Old Style', Palatino, Georgia, serif";
const MONO = "'Cascadia Mono', Consolas, 'Courier New', monospace";

// Suite pseudo-aléatoire reproductible : le même décor à chaque visite.
export function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// Le cours fictif du terminal : chaque bougie part de la clôture de la précédente.
export function nextCandle(previousClose, random) {
  const open = previousClose;
  const close = Math.min(0.92, Math.max(0.08, open + (random() - 0.48) * 0.12));
  const high = Math.min(0.97, Math.max(open, close) + random() * 0.04);
  const low = Math.max(0.03, Math.min(open, close) - random() * 0.04);
  return { open, close, high, low };
}

// Angles des aiguilles (en radians, sens horaire depuis midi) pour une heure donnée.
export function clockAngles(hours, minutes, seconds) {
  const turn = Math.PI * 2;
  return {
    hour: (((hours % 12) + minutes / 60) / 12) * turn,
    minute: ((minutes + seconds / 60) / 60) * turn,
    second: (seconds / 60) * turn,
  };
}

// Ce qu'un terminal de discussion affiche après `elapsed` secondes : la question se tape,
// puis les lignes de réponse arrivent une à une.
export function chatProgress(question, answerLines, elapsed) {
  const typed = Math.min(question.length, Math.floor(elapsed * 22));
  const after = elapsed - question.length / 22 - 0.5;
  const lines = after < 0 ? 0 : Math.min(answerLines.length, 1 + Math.floor(after / 0.6));
  return { question: question.slice(0, typed), lines: answerLines.slice(0, lines), done: lines === answerLines.length };
}

// Discussions fictives du terminal d'IA locale.
const CHATS = {
  fr: [
    ['Tu fonctionnes sans Internet ?', ['Oui. Tout tourne sur ce portable.', 'Aucune donnée ne sort de la machine.']],
    ['Résume cette note en trois points.', ['1. L’idée principale', '2. Les preuves clés', '3. La prochaine action']],
    ['Relis ce mail avant envoi.', ['Fait : ton plus clair,', 'deux fautes corrigées.']],
  ],
  en: [
    ['Do you work without the Internet?', ['Yes. Everything runs on this laptop.', 'No data leaves the machine.']],
    ['Summarise this note in three points.', ['1. The main idea', '2. The key evidence', '3. The next action']],
    ['Proofread this email before I send it.', ['Done: clearer tone,', 'two typos fixed.']],
  ],
};

// Volumes invisibles du salon : la cheminée et la bibliothèque, collées aux murs, se contournent.
export const HALL_OBSTACLES = [
  ...[2.6, 3.25, 3.9].map((z) => ({ x: 4.7, z, radius: 0.4 })),
  ...Array.from({ length: 9 }, (_, i) => ({ x: -0.4 + i * 0.4, z: 6.45, radius: 0.25 })),
];

export function buildProps({ scene, keep, count, lang, gardenSegment = -1, realTexture = () => {} }) {
  const mat = (color, extra = {}) => keep(new MeshLambertMaterial({ color, ...extra }));
  const basic = (color, extra = {}) => keep(new MeshBasicMaterial({ color, ...extra }));
  const gold = mat('#d9ad4e', { emissive: '#5a430f' });
  const ink = mat('#1b1b1b');
  const wood = mat('#6b4428');
  const darkWood = mat('#3b2616');
  // des matières photographiques sur les objets : bois, cuir, pierre
  realTexture('wood_table_001', 1, 1, wood, '#a9774c', 1.3);
  realTexture('wood_table_001', 1, 1, darkWood, '#6a4a31', 1.2);
  const props = [];

  function put(parent, geometry, material, x, y, z) {
    const mesh = new Mesh(keep(geometry), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  function canvasTexture(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const tex = keep(new CanvasTexture(canvas));
    tex.colorSpace = SRGBColorSpace;
    return { canvas, ctx: canvas.getContext('2d'), tex };
  }

  function register(prop, group) {
    const meshes = [];
    group.traverse((node) => {
      if (!node.isMesh) return;
      node.userData.propId = prop.id;
      meshes.push(node);
    });
    scene.add(group);
    props.push({ radius: 0, reach: 2.8, decor: false, animate() {}, setLang() {}, interact: () => null, ...prop, meshes: prop.decor ? [] : meshes });
  }

  // une ombre douce au sol : les objets ne flottent plus
  const shadowMat = basic('#000000', { transparent: true, opacity: 0.22, depthWrite: false });
  function shadow(group, radius, x = 0, z = 0) {
    const blob = put(group, new CircleGeometry(radius, 22), shadowMat, x, 0.024, z);
    blob.rotation.x = -Math.PI / 2;
  }

  // ---------- mobilier de musée ----------
  function bench(x, z, segment, rotY = 0) {
    const group = new Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    put(group, new BoxGeometry(1.9, 0.09, 0.52), wood, 0, 0.46, 0);
    put(group, new BoxGeometry(1.8, 0.05, 0.44), mat('#2a2f38'), 0, 0.53, 0);
    for (const sx of [-0.8, 0.8]) put(group, new BoxGeometry(0.08, 0.42, 0.46), ink, sx, 0.21, 0);
    shadow(group, 0.95);
    register({ id: `banc-${props.length}`, decor: true, segment, x, z, radius: 0.75, reach: 0 }, group);
  }

  function rug(z, length, segment, color, border) {
    const group = new Group();
    group.position.set(0, 0, z);
    const base = put(group, new PlaneGeometry(2.6, length), mat(border), 0, 0.012, 0);
    base.rotation.x = -Math.PI / 2;
    const inner = put(group, new PlaneGeometry(2.2, length - 0.4), mat(color), 0, 0.018, 0);
    inner.rotation.x = -Math.PI / 2;
    register({ id: `tapis-${props.length}`, decor: true, segment, x: 0, z, reach: 0 }, group);
  }

  function plant(x, z, segment) {
    const group = new Group();
    group.position.set(x, 0, z);
    put(group, new CylinderGeometry(0.26, 0.2, 0.5, 14), mat('#b9643c'), 0, 0.25, 0);
    put(group, new SphereGeometry(0.42, 12, 10), mat('#3f7d4a'), 0, 0.95, 0);
    put(group, new SphereGeometry(0.3, 12, 10), mat('#55995c'), 0.18, 1.3, 0.08);
    put(group, new SphereGeometry(0.26, 12, 10), mat('#356b40'), -0.2, 1.22, -0.1);
    shadow(group, 0.5);
    register({ id: `plante-${props.length}`, decor: true, segment, x, z, radius: 0.4, reach: 0 }, group);
  }

  // un bureau avec son écran ; renvoie le groupe et la texture de l'écran
  function desk(x, z, rotY) {
    const group = new Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    put(group, new BoxGeometry(1.7, 0.06, 0.75), wood, 0, 0.78, 0);
    for (const [lx, lz] of [[-0.78, -0.3], [0.78, -0.3], [-0.78, 0.3], [0.78, 0.3]]) put(group, new BoxGeometry(0.06, 0.78, 0.06), ink, lx, 0.39, lz);
    put(group, new BoxGeometry(1.36, 0.84, 0.05), ink, 0, 1.38, -0.12);
    put(group, new BoxGeometry(0.1, 0.2, 0.05), ink, 0, 0.9, -0.12);
    put(group, new BoxGeometry(0.5, 0.03, 0.26), ink, 0, 0.825, -0.1);
    shadow(group, 1.05);
    const screen = canvasTexture(512, 300);
    put(group, new PlaneGeometry(1.26, 0.74), basic('#ffffff', { map: screen.tex }), 0, 1.38, -0.09);
    return { group, screen };
  }

  // ---------- hall : un salon de lecture, cheminée, fauteuils, bibliothèque ----------
  {
    rug(3.2, 5.6, 0, '#7a1f2b', '#c9a24a');
    plant(-4.2, 5.7, 0);
    const leather = mat('#6b3a22');
    realTexture('brown_leather', 1, 1, leather, '#9a5a38', 1.5);
    const armchair = (x, z, rotY) => {
      const group = new Group();
      group.position.set(x, 0, z);
      group.rotation.y = rotY;
      put(group, new BoxGeometry(0.8, 0.3, 0.8), leather, 0, 0.3, 0);
      put(group, new BoxGeometry(0.8, 0.75, 0.2), leather, 0, 0.7, -0.34);
      for (const sx of [-0.42, 0.42]) put(group, new BoxGeometry(0.16, 0.5, 0.8), leather, sx, 0.45, 0);
      put(group, new BoxGeometry(0.62, 0.1, 0.56), mat('#8a5236'), 0, 0.49, 0.04);
      shadow(group, 0.7);
      register({ id: `fauteuil-${props.length}`, decor: true, segment: 0, x, z, radius: 0.62, reach: 0 }, group);
    };
    armchair(2.6, 2.0, Math.PI / 2 + 0.35);
    armchair(2.6, 4.5, Math.PI / 2 - 0.35);

    // la cheminée : un manteau de pierre, des flammes qui dansent
    const hearth = new Group();
    hearth.position.set(4.72, 0, 3.25);
    const stone = mat('#b9b2a4');
    realTexture('japanese_stone_wall', 1, 2, stone, '#d8d2c6', 1.5);
    put(hearth, new BoxGeometry(0.5, 1.5, 2.2), stone, 0, 0.75, 0);
    put(hearth, new BoxGeometry(0.62, 0.12, 2.5), wood, -0.04, 1.56, 0);
    put(hearth, new BoxGeometry(0.4, 2.9, 1.3), stone, 0.02, 3.05, 0);
    put(hearth, new BoxGeometry(0.1, 0.95, 1.3), mat('#16110d'), -0.22, 0.5, 0);
    const flames = [0, 1, 2, 3].map((i) => {
      const flame = put(hearth, new ConeGeometry(0.16, 0.5, 8), basic(i % 2 ? '#ffb347' : '#ff7a2e'), -0.26, 0.3, -0.4 + i * 0.27);
      return flame;
    });
    for (const lz of [-0.3, 0.2]) put(hearth, new CylinderGeometry(0.07, 0.07, 0.9, 8), mat('#3b2616'), -0.26, 0.09, lz).rotation.x = Math.PI / 2;
    const ember = put(hearth, new PlaneGeometry(1.6, 1.4), basic('#ff9a4a', { transparent: true, opacity: 0.16, depthWrite: false }), -1.0, 0.03, 0);
    ember.rotation.x = -Math.PI / 2;
    register(
      {
        id: 'cheminee',
        decor: true,
        segment: 0,
        x: 4.72,
        z: 3.25,
        reach: 0,
        animate: (time) => {
          flames.forEach((flame, i) => {
            flame.scale.set(1 + 0.2 * Math.sin(time * 9 + i * 2), 1 + 0.45 * Math.abs(Math.sin(time * 7 + i * 1.7)), 1);
            flame.position.y = 0.3 + 0.1 * Math.abs(Math.sin(time * 7 + i * 1.7));
          });
          ember.material.opacity = 0.13 + 0.07 * Math.sin(time * 6);
        },
      },
      hearth,
    );

    // une bibliothèque contre le mur du fond, un guéridon, un lampadaire
    const shelf = new Group();
    shelf.position.set(1.2, 0, 6.32);
    put(shelf, new BoxGeometry(3.4, 2.6, 0.32), wood, 0, 1.3, 0);
    const spines = ['#7a1f2b', '#1d3b53', '#2f5d46', '#c9a24a', '#3b2616', '#8a5a2b', '#20242b'];
    const spineMats = spines.map((color) => mat(color));
    const bookGeo = keep(new BoxGeometry(1, 1, 1));
    const random = seeded(23);
    for (let row = 0; row < 4; row++) {
      put(shelf, new BoxGeometry(3.3, 0.04, 0.3), mat('#4a2f1c'), 0, 0.22 + row * 0.62, -0.04);
      let x = -1.58;
      while (x < 1.5) {
        const w = 0.07 + random() * 0.07;
        const h = 0.36 + random() * 0.16;
        put(shelf, bookGeo, spineMats[Math.floor(random() * spines.length)], x + w / 2, 0.24 + row * 0.62 + h / 2, -0.1).scale.set(w, h, 0.2);
        x += w + 0.008;
      }
    }
    register({ id: 'bibliotheque', decor: true, segment: 0, x: 1.2, z: 6.32, reach: 0 }, shelf);

    const lamp = new Group();
    lamp.position.set(4.1, 0, 5.6);
    put(lamp, new CylinderGeometry(0.2, 0.24, 0.05, 16), ink, 0, 0.025, 0);
    put(lamp, new CylinderGeometry(0.02, 0.02, 1.6, 8), gold, 0, 0.82, 0);
    put(lamp, new CylinderGeometry(0.18, 0.32, 0.36, 18, 1, true), basic('#ffd9a0', { side: DoubleSide }), 0, 1.72, 0);
    put(lamp, new SphereGeometry(0.08, 10, 8), basic('#fff4d6'), 0, 1.66, 0);
    shadow(lamp, 0.34);
    register({ id: 'lampadaire', decor: true, segment: 0, x: 4.1, z: 5.6, radius: 0.3, reach: 0 }, lamp);

    const side = new Group();
    side.position.set(3.2, 0, 3.25);
    put(side, new CylinderGeometry(0.3, 0.3, 0.04, 18), wood, 0, 0.5, 0);
    put(side, new CylinderGeometry(0.035, 0.035, 0.5, 8), wood, 0, 0.25, 0);
    put(side, new BoxGeometry(0.26, 0.04, 0.18), mat('#1d3b53'), -0.04, 0.54, 0.02).rotation.y = 0.4;
    put(side, new CylinderGeometry(0.045, 0.035, 0.07, 12), mat('#f4ecd8'), 0.13, 0.555, -0.08);
    shadow(side, 0.36);
    // sur le guéridon, de quoi écrire : le contact est proposé dès l'accueil, pas seulement au bout du musée
    put(side, new BoxGeometry(0.2, 0.012, 0.14), mat('#fbf8f0'), 0.02, 0.527, 0.12).rotation.y = -0.3;
    register({ id: 'contact-accueil', segment: 0, x: 3.2, z: 3.25, radius: 0.32, reach: 2.4, counts: false, title: { fr: 'Me contacter', en: 'Get in touch' }, interact: () => 'panel:contact' }, side);
  }

  // ---------- salle 1 : ce que je vois à l'écran ----------
  if (count > 0) {
    rug(-6, 9.5, 1, '#1a2550', '#c9a24a');
    bench(0, -6, 1, Math.PI / 2);

    // le terminal d'IA locale : une discussion hors ligne
    const ai = desk(3.6, -2.5, -Math.PI / 2 + 0.3);
    let chat = 0;
    let chatStart = 0;
    let chatLang = lang;
    let now = 0;
    let lastDraw = -1;
    const drawChat = () => {
      const { ctx } = ai.screen;
      const [question, answer] = CHATS[chatLang === 'en' ? 'en' : 'fr'][chat];
      const state = chatProgress(question, answer, now - chatStart);
      ctx.fillStyle = '#0b1118';
      ctx.fillRect(0, 0, 512, 300);
      ctx.fillStyle = '#16202c';
      ctx.fillRect(0, 0, 512, 40);
      ctx.textBaseline = 'middle';
      ctx.font = `700 18px ${MONO}`;
      ctx.fillStyle = '#8693a3';
      ctx.fillText(chatLang === 'en' ? 'ollama · scripted demo' : 'ollama · démo scénarisée', 14, 21);
      ctx.fillStyle = '#ff6b5e';
      ctx.textAlign = 'right';
      ctx.fillText(chatLang === 'en' ? '● offline' : '● hors ligne', 498, 21);
      ctx.textAlign = 'left';
      ctx.font = `400 19px ${MONO}`;
      ctx.fillStyle = '#38d6ff';
      ctx.fillText(`> ${state.question}${state.lines.length === 0 && Math.floor(now * 2) % 2 ? '▌' : ''}`, 14, 78);
      ctx.fillStyle = '#5ef2b0';
      state.lines.forEach((line, i) => ctx.fillText(line, 14, 126 + i * 34));
      if (state.done) {
        ctx.fillStyle = '#f0c860';
        ctx.font = `700 15px ${MONO}`;
        ctx.fillText(chatLang === 'en' ? '[E] next question' : '[E] question suivante', 14, 276);
      }
      ai.screen.tex.needsUpdate = true;
    };
    drawChat();
    register(
      {
        id: 'ia-locale',
        segment: 1,
        x: 3.6,
        z: -2.5,
        radius: 0.95,
        title: { fr: 'Parler à l’IA hors ligne', en: 'Talk to the offline AI' },
        animate: (time) => {
          now = time;
          if (time - lastDraw < 0.12) return;
          lastDraw = time;
          drawChat();
        },
        interact: () => {
          chat = (chat + 1) % CHATS.fr.length;
          chatStart = now;
          return 'screen';
        },
        setLang: (next) => {
          chatLang = next;
          drawChat();
        },
      },
      ai.group,
    );

    // le coffre de notes : une vue graphe où circulent les agents
    const vault = desk(-3.6, -9.6, Math.PI / 2 - 0.3);
    let layout = 3;
    let nodes = [];
    const shuffle = () => {
      const random = seeded(layout);
      nodes = Array.from({ length: 16 }, (_, i) => ({ x: 170 + random() * 320, y: 30 + random() * 240, r: i < 3 ? 9 : 5, link: Math.floor(random() * 3) }));
    };
    shuffle();
    let vaultLang = lang;
    let lastGraph = -1;
    const drawVault = (time) => {
      const { ctx } = vault.screen;
      ctx.fillStyle = '#17131f';
      ctx.fillRect(0, 0, 512, 300);
      ctx.fillStyle = '#211b2d';
      ctx.fillRect(0, 0, 150, 300);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.font = `700 13px ${MONO}`;
      ctx.fillStyle = '#b9a8f0';
      ctx.fillText(vaultLang === 'en' ? 'vault · graph' : 'coffre · graphe', 12, 18);
      const folders = ['notes/', '  idees/', '  lectures/', '  methodes/', 'archives/', 'agents/', '  plan.md', '  revue.md'];
      ctx.font = `400 13px ${MONO}`;
      folders.forEach((name, i) => {
        ctx.fillStyle = i === Math.floor(time * 0.7) % folders.length ? '#f0c860' : '#8d83a8';
        ctx.fillText(name, 12, 48 + i * 24);
      });
      ctx.strokeStyle = 'rgba(139, 108, 239, 0.55)';
      ctx.lineWidth = 1.5;
      nodes.forEach((node, i) => {
        if (i < 3) return;
        const hub = nodes[node.link];
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(hub.x, hub.y);
        ctx.stroke();
        // un agent parcourt le lien
        const k = (time * 0.4 + i * 0.21) % 1;
        ctx.fillStyle = '#5ef2b0';
        ctx.beginPath();
        ctx.arc(node.x + (hub.x - node.x) * k, node.y + (hub.y - node.y) * k, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.beginPath();
      ctx.moveTo(nodes[0].x, nodes[0].y);
      ctx.lineTo(nodes[1].x, nodes[1].y);
      ctx.lineTo(nodes[2].x, nodes[2].y);
      ctx.stroke();
      nodes.forEach((node, i) => {
        ctx.fillStyle = i < 3 ? '#f0c860' : '#8b6cef';
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r + (i < 3 ? Math.sin(time * 2 + i) : 0), 0, Math.PI * 2);
        ctx.fill();
      });
      vault.screen.tex.needsUpdate = true;
    };
    drawVault(0);
    register(
      {
        id: 'coffre',
        segment: 1,
        x: -3.6,
        z: -9.6,
        radius: 0.95,
        title: { fr: 'Réorganiser le coffre', en: 'Reorganise the vault' },
        animate: (time) => {
          if (time - lastGraph < 0.1) return;
          lastGraph = time;
          drawVault(time);
        },
        interact: () => {
          layout += 1;
          shuffle();
          return 'screen';
        },
        setLang: (next) => {
          vaultLang = next;
        },
      },
      vault.group,
    );
  }

  // ---------- salle 2 : le temple, le poste de trading, le katana ----------
  if (count > 1) {
    const zRoom = -ROOM_DEPTH;

    // la salle de marché : tapis sombre, mur d'écrans, horloges de trois places financières
    rug(zRoom - 6, 9.5, 2, '#1f2630', '#3a4452');
    const wallGroup = new Group();
    const charts = canvasTexture(512, 300);
    put(wallGroup, new BoxGeometry(2.6, 1.56, 0.06), ink, 3.2, 2.0, zRoom - ROOM_DEPTH + 0.19);
    put(wallGroup, new PlaneGeometry(2.48, 1.44), basic('#ffffff', { map: charts.tex }), 3.2, 2.0, zRoom - ROOM_DEPTH + 0.225);
    const series = [0, 1, 2, 3].map((i) => {
      const r = seeded(60 + i);
      let v = 0.5;
      return { r, values: Array.from({ length: 40 }, () => (v = Math.min(0.9, Math.max(0.1, v + (r() - 0.5) * 0.12)))) };
    });
    const drawCharts = () => {
      const { ctx } = charts;
      ctx.fillStyle = '#0b1118';
      ctx.fillRect(0, 0, 512, 300);
      series.forEach((serie, i) => {
        const ox = (i % 2) * 256;
        const oy = Math.floor(i / 2) * 150;
        ctx.strokeStyle = '#1e2a38';
        ctx.strokeRect(ox + 4, oy + 4, 248, 142);
        const up = serie.values[39] >= serie.values[0];
        ctx.strokeStyle = up ? '#5ef2b0' : '#ff6b5e';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        serie.values.forEach((v, k) => (k ? ctx.lineTo(ox + 10 + k * 6, oy + 140 - v * 124) : ctx.moveTo(ox + 10, oy + 140 - v * 124)));
        ctx.stroke();
      });
      charts.tex.needsUpdate = true;
    };
    drawCharts();
    const clocks = canvasTexture(600, 220);
    put(wallGroup, new PlaneGeometry(2.7, 0.99), basic('#ffffff', { map: clocks.tex }), -3.2, 2.15, zRoom - ROOM_DEPTH + 0.2);
    const zones = [['NEW YORK', 'America/New_York'], ['LONDON', 'Europe/London'], ['TOKYO', 'Asia/Tokyo']];
    const zoneTime = (timeZone) => {
      try {
        const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(new Date());
        const get = (type) => Number(parts.find((part) => part.type === type).value);
        return [get('hour') % 24, get('minute'), get('second')];
      } catch {
        const d = new Date();
        return [d.getHours(), d.getMinutes(), d.getSeconds()];
      }
    };
    const drawClocks = () => {
      const { ctx } = clocks;
      ctx.fillStyle = '#10151c';
      ctx.fillRect(0, 0, 600, 220);
      zones.forEach(([label, zone], i) => {
        const cx = 100 + i * 200;
        const [h, m, s] = zoneTime(zone);
        const angles = clockAngles(h, m, s);
        ctx.fillStyle = '#f4f1ea';
        ctx.beginPath();
        ctx.arc(cx, 92, 74, 0, Math.PI * 2);
        ctx.fill();
        const handTo = (angle, length, width, color) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.beginPath();
          ctx.moveTo(cx, 92);
          ctx.lineTo(cx + Math.sin(angle) * length, 92 - Math.cos(angle) * length);
          ctx.stroke();
        };
        handTo(angles.hour, 38, 7, '#1b1b1b');
        handTo(angles.minute, 58, 5, '#1b1b1b');
        handTo(angles.second, 64, 2, '#b3261e');
        ctx.fillStyle = '#c9a24a';
        ctx.font = `700 20px ${MONO}`;
        ctx.textAlign = 'center';
        ctx.fillText(label, cx, 196);
      });
      clocks.tex.needsUpdate = true;
    };
    drawClocks();
    let lastChart = 0;
    let lastClock = 0;
    register(
      {
        id: 'mur-ecrans',
        decor: true,
        segment: 2,
        x: 0,
        z: zRoom - ROOM_DEPTH,
        reach: 0,
        animate: (time) => {
          if (time - lastChart > 0.5) {
            lastChart = time;
            for (const serie of series) {
              const last = serie.values[serie.values.length - 1];
              serie.values.shift();
              serie.values.push(Math.min(0.9, Math.max(0.1, last + (serie.r() - 0.5) * 0.12)));
            }
            drawCharts();
          }
          if (time - lastClock > 1) {
            lastClock = time;
            drawClocks();
          }
        },
      },
      wallGroup,
    );

    // le poste de trading : écran, clavier à touches de couleur, fauteuil de bureau
    const trade = desk(3.6, zRoom - 2.9, -Math.PI / 2 + 0.3);
    const keyboard = canvasTexture(256, 96);
    keyboard.ctx.fillStyle = '#101317';
    keyboard.ctx.fillRect(0, 0, 256, 96);
    const keyColors = ['#f0c860', '#5ef2b0', '#ff6b5e', '#38d6ff'];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 16; col++) {
        keyboard.ctx.fillStyle = row === 0 ? keyColors[col % 4] : col > 12 && row < 3 ? keyColors[(row + col) % 4] : '#2b313a';
        keyboard.ctx.fillRect(6 + col * 15.4, 6 + row * 17.4, 12.5, 14);
      }
    }
    keyboard.tex.needsUpdate = true;
    put(trade.group, new BoxGeometry(0.72, 0.03, 0.26), ink, 0, 0.825, 0.18);
    const keys = put(trade.group, new PlaneGeometry(0.7, 0.24), basic('#ffffff', { map: keyboard.tex }), 0, 0.842, 0.18);
    keys.rotation.x = -Math.PI / 2;
    const chair = new Group();
    chair.position.set(0, 0, 0.95);
    put(chair, new CylinderGeometry(0.3, 0.3, 0.05, 5), ink, 0, 0.06, 0);
    put(chair, new CylinderGeometry(0.035, 0.035, 0.42, 10), mat('#8a9099'), 0, 0.28, 0);
    put(chair, new BoxGeometry(0.52, 0.09, 0.5), mat('#20242b'), 0, 0.52, 0);
    put(chair, new BoxGeometry(0.5, 0.62, 0.08), mat('#20242b'), 0, 0.88, 0.24).rotation.x = 0.12;
    for (const ax of [-0.29, 0.29]) put(chair, new BoxGeometry(0.05, 0.05, 0.34), ink, ax, 0.72, 0.02);
    trade.group.add(chair);
    const random2 = seeded(42);
    const candles = [];
    let close = 0.5;
    for (let i = 0; i < 34; i++) {
      const candle = nextCandle(close, random2);
      candles.push(candle);
      close = candle.close;
    }
    let bot = false;
    let lastTick = 0;
    const drawScreen = () => {
      const { ctx } = trade.screen;
      ctx.fillStyle = '#0b1118';
      ctx.fillRect(0, 0, 512, 300);
      ctx.strokeStyle = '#1e2a38';
      ctx.lineWidth = 1;
      for (let i = 1; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * 50);
        ctx.lineTo(512, i * 50);
        ctx.stroke();
      }
      const y = (v) => 270 - v * 230;
      candles.forEach((candle, i) => {
        const x = 12 + i * 14.4;
        const up = candle.close >= candle.open;
        ctx.strokeStyle = ctx.fillStyle = up ? '#5ef2b0' : '#ff6b5e';
        ctx.beginPath();
        ctx.moveTo(x + 4, y(candle.high));
        ctx.lineTo(x + 4, y(candle.low));
        ctx.stroke();
        ctx.fillRect(x, y(Math.max(candle.open, candle.close)), 8, Math.max(2, Math.abs(y(candle.open) - y(candle.close))));
        if (bot && i % 6 === 3) {
          ctx.fillStyle = '#f0c860';
          ctx.beginPath();
          const base = up ? y(candle.low) + 16 : y(candle.high) - 16;
          ctx.moveTo(x + 4, up ? base - 10 : base + 10);
          ctx.lineTo(x - 3, base);
          ctx.lineTo(x + 11, base);
          ctx.closePath();
          ctx.fill();
        }
      });
      ctx.font = `700 20px ${MONO}`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f0c860';
      ctx.fillText('DEMO', 14, 10);
      ctx.fillStyle = bot ? '#5ef2b0' : '#8693a3';
      ctx.fillText(bot ? 'BOT ON' : 'BOT OFF', 400, 10);
      trade.screen.tex.needsUpdate = true;
    };
    drawScreen();
    register(
      {
        id: 'terminal',
        segment: 2,
        x: 3.6,
        z: zRoom - 2.9,
        radius: 1.05,
        title: { fr: 'Lancer le bot (démo)', en: 'Start the bot (demo)' },
        animate: (time) => {
          if (time - lastTick < 0.45) return;
          lastTick = time;
          candles.shift();
          candles.push(nextCandle(candles[candles.length - 1].close, random2));
          drawScreen();
        },
        interact: () => {
          bot = !bot;
          drawScreen();
          return 'screen';
        },
      },
      trade.group,
    );

    // la peluche : un tanuki tout rond, création originale
    const plush = new Group();
    // elle attend sur la table basse du pavillon, dans le jardin
    plush.position.set(-14.3, 0.605, -ROOM_DEPTH - 5.1);
    plush.rotation.y = 1.2;
    const fur = mat('#8a6a4a');
    const cream = mat('#f1e3c8');
    put(plush, new SphereGeometry(0.17, 16, 12), fur, 0, 0.16, 0).scale.set(1, 0.95, 0.95);
    put(plush, new SphereGeometry(0.12, 14, 10), cream, 0, 0.13, 0.08).scale.set(0.9, 0.95, 0.7);
    put(plush, new SphereGeometry(0.12, 16, 12), fur, 0, 0.38, 0);
    put(plush, new SphereGeometry(0.055, 10, 8), cream, 0, 0.35, 0.09);
    for (const ex of [-0.05, 0.05]) {
      put(plush, new SphereGeometry(0.035, 8, 8), mat('#2a1c12'), ex, 0.4, 0.09);
      put(plush, new SphereGeometry(0.014, 6, 6), basic('#ffffff'), ex, 0.405, 0.12);
      put(plush, new ConeGeometry(0.04, 0.07, 8), fur, ex * 1.7, 0.5, 0);
    }
    put(plush, new SphereGeometry(0.018, 6, 6), ink, 0, 0.36, 0.14);
    put(plush, new SphereGeometry(0.07, 10, 8), mat('#5a422c'), 0, 0.1, -0.17);
    let hug = -10;
    let plushNow = 0;
    register(
      {
        id: 'peluche',
        bonus: true,
        segment: gardenSegment,
        x: -14.3,
        z: -ROOM_DEPTH - 5.1,
        reach: 2.2,
        title: { fr: 'Câliner la peluche', en: 'Hug the plush' },
        animate: (time) => {
          plushNow = time;
          const k = (time - hug) / 0.8;
          const squish = k >= 0 && k <= 1 ? Math.sin(k * Math.PI * 3) * (1 - k) * 0.25 : 0;
          plush.scale.set(1 + squish, 1 - squish, 1 + squish);
          plush.rotation.z = 0.05 * Math.sin(time * 1.5);
        },
        interact: () => {
          hug = plushNow;
          return 'hug';
        },
      },
      plush,
    );

    // le katana, sur son présentoir dans le pavillon du jardin
    const stand = new Group();
    stand.position.set(-15.9, 0.16, -ROOM_DEPTH - 6);
    stand.rotation.y = Math.PI / 2;
    put(stand, new BoxGeometry(1.5, 0.08, 0.36), darkWood, 0, 0.04, 0);
    for (const sx of [-0.5, 0.5]) put(stand, new BoxGeometry(0.07, 0.9, 0.1), darkWood, sx, 0.49, 0);
    const katana = new Group();
    katana.position.set(0, 0.98, 0);
    const steel = mat('#dfe6ee', { emissive: '#5c6b7a' });
    put(katana, new BoxGeometry(1.05, 0.045, 0.012), steel, 0.2, 0, 0);
    put(katana, new CylinderGeometry(0.06, 0.06, 0.02, 14), gold, -0.34, 0, 0).rotation.z = Math.PI / 2;
    put(katana, new BoxGeometry(0.34, 0.05, 0.03), mat('#12202e'), -0.52, 0, 0);
    stand.add(katana);
    let swingStart = -10;
    let katanaNow = 0;
    register(
      {
        id: 'katana',
        bonus: true,
        segment: gardenSegment,
        x: -15.9,
        z: -ROOM_DEPTH - 6,
        radius: 0.5,
        title: { fr: 'Dégainer le katana', en: 'Draw the katana' },
        animate: (time) => {
          katanaNow = time;
          const k = (time - swingStart) / 0.7;
          if (k >= 0 && k <= 1) {
            const arc = Math.sin(k * Math.PI);
            katana.position.set(-arc * 0.5, 0.98 + arc * 0.8, arc * 0.9);
            katana.rotation.set(0, arc * 0.6, -arc * 2.4 + k * Math.PI * 2 * (1 - k));
          } else {
            katana.position.set(0, 0.98, 0);
            katana.rotation.set(0, 0, 0);
          }
        },
        interact: () => {
          swingStart = katanaNow;
          return 'slash';
        },
      },
      stand,
    );
  }

  // ---------- salle 3 : mobilier ----------
  if (count > 2) {
    const zRoom = -2 * ROOM_DEPTH;
    rug(zRoom - 6, 9.5, 3, '#2f4a3a', '#c9a24a');
    bench(0, zRoom - 6, 3, Math.PI / 2);
    plant(-4.2, zRoom - 1.2, 3);

    // le studio : tableau blanc, étagères, suspensions
    const studio = new Group();
    const board = canvasTexture(512, 300);
    board.ctx.fillStyle = '#fdfdfb';
    board.ctx.fillRect(0, 0, 512, 300);
    board.ctx.strokeStyle = '#1d3b53';
    board.ctx.lineWidth = 4;
    for (const [bx, by] of [[40, 50], [200, 50], [360, 50], [200, 190]]) board.ctx.strokeRect(bx, by, 110, 60);
    board.ctx.beginPath();
    for (const [x1, y1, x2, y2] of [[150, 80, 200, 80], [310, 80, 360, 80], [255, 110, 255, 190]]) {
      board.ctx.moveTo(x1, y1);
      board.ctx.lineTo(x2, y2);
    }
    board.ctx.stroke();
    board.ctx.fillStyle = '#b3261e';
    board.ctx.font = `700 22px ${MONO}`;
    ['brief', 'design', 'code', 'test'].forEach((word, i) => board.ctx.fillText(word, [58, 212, 384, 228][i], [86, 86, 86, 226][i]));
    board.tex.needsUpdate = true;
    put(studio, new BoxGeometry(2.7, 1.7, 0.05), mat('#c9ccd1'), 3.2, 1.85, zRoom - ROOM_DEPTH + 0.19);
    put(studio, new PlaneGeometry(2.56, 1.56), basic('#ffffff', { map: board.tex }), 3.2, 1.85, zRoom - ROOM_DEPTH + 0.22);
    put(studio, new BoxGeometry(2.4, 2.3, 0.3), mat('#d8c7a8'), -3.2, 1.25, zRoom - ROOM_DEPTH + 0.32);
    const tones = ['#1d3b53', '#b3261e', '#2f5d46', '#c9a24a', '#20242b', '#8a5a2b'];
    const toneMats = tones.map((color) => mat(color));
    const studioBook = keep(new BoxGeometry(1, 1, 1));
    for (let row = 0; row < 3; row++) {
      put(studio, new BoxGeometry(2.3, 0.04, 0.34), mat('#b8a583'), -3.2, 0.5 + row * 0.7, zRoom - ROOM_DEPTH + 0.36);
      for (let i = 0; i < 9; i++) put(studio, studioBook, toneMats[(i + row * 2) % tones.length], -4.15 + i * 0.235, 0.72 + row * 0.7, zRoom - ROOM_DEPTH + 0.42).scale.set(0.16, 0.36 + ((i * 7 + row * 3) % 5) * 0.04, 0.22);
    }
    for (const lx of [-2.4, 0, 2.4]) {
      put(studio, new CylinderGeometry(0.008, 0.008, 0.9, 6), ink, lx, 4.05, zRoom - 6);
      put(studio, new SphereGeometry(0.2, 16, 12), basic('#fffbe8'), lx, 3.5, zRoom - 6);
    }
    register({ id: 'studio', decor: true, segment: 3, x: 0, z: zRoom - 6, reach: 0 }, studio);
  }

  // ---------- salle 4 : l'avatar en relief, la montre du lapin blanc ----------
  if (count > 3) {
    const zRoom = -3 * ROOM_DEPTH;
    bench(0, zRoom - 6, 4, Math.PI / 2);

    // l'avatar : un petit compagnon orange en gros pixels, qui se tourne vers le visiteur
    // le dessin du personnage, pixel par pixel : O orange, D sombre, W clair
    const SPRITE = [
      '....O....O....',
      '....O....O....',
      '..OOOOOOOOOO..',
      '.OOOOOOOOOOOO.',
      '.OODDOOOODDOO.',
      '.OODDOOOODDOO.',
      '.OOOOOOOOOOOO.',
      'OOOOWOOOOOOOOO',
      'OOOOOWOOWWWOOO',
      'OOOOWOOOOOOOOO',
      '.OOOOOOOOOOOO.',
      '.OO.OO..OO.OO.',
      '.OO.OO..OO.OO.',
    ];
    const TONES = { O: { r: 217, g: 119, b: 54 }, D: { r: 38, g: 24, b: 16 }, W: { r: 250, g: 240, b: 225 } };
    const cols = SPRITE[0].length;
    const rows = SPRITE.length;
    const lit = [];
    SPRITE.forEach((line, row) => {
      [...line].forEach((char, col) => {
        if (TONES[char]) lit.push({ col, row, cell: TONES[char] });
      });
    });
    const size = 0.085;
    const cubes = keep(new InstancedMesh(keep(new BoxGeometry(size * 0.96, size * 0.96, size * 3)), mat('#ffffff'), Math.max(1, lit.length)));
    const dummy = new Object3D();
    const color = new Color();
    const place = (wave, time) => {
      lit.forEach((voxel, i) => {
        const u = (voxel.col - cols / 2) / (cols / 2);
        const v = (rows / 2 - voxel.row) / (rows / 2);
        const dome = Math.sqrt(Math.max(0, 1 - u * u)) * 0.05;
        const ripple = wave >= 0 ? Math.sin(Math.hypot(u, v) * 9 - wave * 12) * Math.max(0, 1 - wave / 1.6) * 0.07 : 0;
        dummy.position.set(u * (cols / 2) * size, v * (rows / 2) * size, dome + ripple + 0.008 * Math.sin(time * 2 + voxel.row * 0.3));
        dummy.updateMatrix();
        cubes.setMatrixAt(i, dummy.matrix);
      });
      cubes.instanceMatrix.needsUpdate = true;
    };
    lit.forEach((voxel, i) => cubes.setColorAt(i, color.setRGB(voxel.cell.r / 255, voxel.cell.g / 255, voxel.cell.b / 255, SRGBColorSpace)));
    if (cubes.instanceColor) cubes.instanceColor.needsUpdate = true;
    place(-1, 0);
    const avatar = new Group();
    avatar.position.set(2.7, 0, zRoom - 3.2);
    put(avatar, new CylinderGeometry(0.5, 0.58, 0.85, 28), mat('#17171c'), 0, 0.425, 0);
    put(avatar, new TorusGeometry(0.5, 0.025, 8, 40), gold, 0, 0.85, 0).rotation.x = Math.PI / 2;
    const bust = new Group();
    bust.position.y = 0.85 + (rows / 2) * size + 0.06;
    bust.add(cubes);
    avatar.add(bust);
    let hello = -10;
    let avatarNow = 0;
    let lastPlace = -1;
    register(
      {
        id: 'avatar',
        bonus: true,
        segment: 4,
        x: 2.7,
        z: zRoom - 3.2,
        radius: 0.7,
        reach: 3.4,
        title: { fr: 'Dire bonjour', en: 'Say hello' },
        animate: (time, visitor) => {
          avatarNow = time;
          // le buste se tourne vers le visiteur
          if (visitor) {
            const target = Math.atan2(visitor.x - 2.7, visitor.z - (zRoom - 3.2));
            let delta = (target - bust.rotation.y) % (Math.PI * 2);
            if (delta > Math.PI) delta -= Math.PI * 2;
            if (delta < -Math.PI) delta += Math.PI * 2;
            bust.rotation.y += delta * 0.06;
          }
          const wave = time - hello;
          if (wave < 1.7 || time - lastPlace > 0.08) {
            lastPlace = time;
            place(wave < 1.7 ? wave : -1, time);
          }
        },
        interact: () => {
          hello = avatarNow;
          return 'hello';
        },
      },
      avatar,
    );

    const watch = new Group();
    watch.position.set(0, 3.25, zRoom - 6);
    watch.rotation.x = 0.35;
    put(watch, new CylinderGeometry(0.82, 0.82, 0.12, 40), gold, 0, 0, 0).rotation.x = Math.PI / 2;
    put(watch, new CylinderGeometry(0.09, 0.09, 0.16, 12), gold, 0, 0.9, 0);
    put(watch, new TorusGeometry(0.13, 0.025, 8, 20), gold, 0, 1.08, 0);
    const face = canvasTexture(256, 256);
    face.ctx.fillStyle = '#fbf6e6';
    face.ctx.beginPath();
    face.ctx.arc(128, 128, 126, 0, Math.PI * 2);
    face.ctx.fill();
    face.ctx.fillStyle = '#1b1b1b';
    face.ctx.font = `400 30px ${SERIF}`;
    face.ctx.textAlign = 'center';
    face.ctx.textBaseline = 'middle';
    ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((numeral, i) => {
      const a = (i / 12) * Math.PI * 2;
      face.ctx.fillText(numeral, 128 + Math.sin(a) * 98, 128 - Math.cos(a) * 98);
    });
    face.tex.needsUpdate = true;
    put(watch, new CircleGeometry(0.74, 40), basic('#ffffff', { map: face.tex }), 0, 0, 0.065);
    const hand = (length, width, tone, depth) => {
      const pivot = new Group();
      pivot.position.z = depth;
      put(pivot, new BoxGeometry(width, length, 0.01), basic(tone), 0, length / 2 - 0.05, 0);
      watch.add(pivot);
      return pivot;
    };
    const hourHand = hand(0.4, 0.05, '#1b1b1b', 0.075);
    const minuteHand = hand(0.6, 0.035, '#1b1b1b', 0.085);
    const secondHand = hand(0.66, 0.014, '#b3261e', 0.095);
    put(watch, new SphereGeometry(0.04, 12, 8), gold, 0, 0, 0.1);
    let madness = -10;
    let watchNow = 0;
    register(
      {
        id: 'montre',
        bonus: true,
        segment: 4,
        x: 0,
        z: zRoom - 6,
        reach: 3.2,
        title: { fr: 'Remonter la montre', en: 'Wind the watch' },
        animate: (time) => {
          watchNow = time;
          const date = new Date();
          const angles = clockAngles(date.getHours(), date.getMinutes(), date.getSeconds() + date.getMilliseconds() / 1000);
          const mad = time - madness < 4 ? (time - madness) * 9 : 0;
          hourHand.rotation.z = -(angles.hour + mad * 0.6);
          minuteHand.rotation.z = -(angles.minute + mad * 2.2);
          secondHand.rotation.z = -(angles.second + mad * 5);
          watch.rotation.z = 0.08 * Math.sin(time * 1.1);
          watch.position.y = 3.25 + 0.06 * Math.sin(time * 0.8);
        },
        interact: () => {
          madness = watchNow;
          return 'late';
        },
      },
      watch,
    );
  }

  // les volumes invisibles s'ajoutent aux objets : ils écartent le visiteur sans rien afficher
  HALL_OBSTACLES.forEach((o, i) => props.push({ id: `volume-salon-${i}`, decor: true, segment: 0, ...o, reach: 0, meshes: [], animate() {}, setLang() {}, interact: () => null }));
  return props;
}
