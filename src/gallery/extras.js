// Suite des curiosités : la petite voiture à conduire,
// les agents qui patrouillent, les jauges de preuves, la maquette du site Tethys
// et le mobilier de l'atelier d'horloger. Même contrat que props.js.
import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { localize } from '../content.js';
import { ROOM_DEPTH } from './tour.js';
import { patrolPoint } from './walk.js';

const SERIF = "'Iowan Old Style', Palatino, Georgia, serif";
const MONO = "'Cascadia Mono', Consolas, 'Courier New', monospace";

export function buildExtras({ scene, keep, count, lang, content, realTexture = () => {} }) {
  const mat = (color, extra = {}) => keep(new MeshLambertMaterial({ color, ...extra }));
  const basic = (color, extra = {}) => keep(new MeshBasicMaterial({ color, ...extra }));
  const gold = mat('#d9ad4e', { emissive: '#5a430f' });
  const ink = mat('#1b1b1b');
  const wood = mat('#6b4428');
  realTexture('wood_table_001', 1, 1, wood, '#a9774c', 1.3);
  const props = [];
  let currentLang = lang;

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
    const entry = { radius: 0, reach: 2.8, decor: false, counts: true, animate() {}, setLang() {}, interact: () => null, ...prop, group, meshes: prop.decor ? [] : meshes };
    props.push(entry);
    return entry;
  }

  // ---------- la petite voiture : on monte avec E, on traverse le musée ----------
  {
    const kart = new Group();
    const paint = mat('#b3261e', { emissive: '#2a0705' });
    put(kart, new BoxGeometry(1.5, 0.22, 0.78), paint, 0, 0.3, 0);
    put(kart, new BoxGeometry(0.55, 0.16, 0.7), paint, 0.62, 0.42, 0).rotation.z = -0.25;
    put(kart, new BoxGeometry(0.5, 0.3, 0.6), ink, -0.45, 0.5, 0);
    put(kart, new TorusGeometry(0.14, 0.025, 8, 18), ink, 0.25, 0.62, 0).rotation.y = Math.PI / 2;
    put(kart, new BoxGeometry(0.06, 0.05, 0.84), gold, 0.76, 0.3, 0);
    for (const [wx, wz] of [[0.5, 0.42], [0.5, -0.42], [-0.5, 0.42], [-0.5, -0.42]]) {
      put(kart, new CylinderGeometry(0.18, 0.18, 0.14, 16), ink, wx, 0.18, wz).rotation.x = Math.PI / 2;
      put(kart, new CylinderGeometry(0.08, 0.08, 0.15, 10), gold, wx, 0.18, wz).rotation.x = Math.PI / 2;
    }
    kart.position.set(-3.3, 0, 4.4);
    kart.rotation.y = Math.PI / 2; // l'avant du modèle pointe vers l'entrée des salles
    register(
      {
        id: 'voiture',
        bonus: true,
        segment: 0,
        x: -3.3,
        z: 4.4,
        radius: 0.9,
        reach: 2.6,
        vehicle: true,
        title: { fr: 'Monter dans la voiture', en: 'Get in the car' },
        titleOut: { fr: 'Descendre de la voiture', en: 'Get out of the car' },
        interact: () => 'drive',
      },
      kart,
    );
  }

  // ---------- les agents : de petits robots qui patrouillent et qu'on peut saluer ----------
  const lines = content.agentsLog || [];
  const robot = (name, segment, loop, color) => {
    const line = lines.find((entry) => entry.agent === name);
    const group = new Group();
    const shell = mat(color);
    put(group, new BoxGeometry(0.36, 0.34, 0.3), shell, 0, 0.42, 0);
    put(group, new BoxGeometry(0.3, 0.22, 0.26), mat('#f4f1ea'), 0, 0.72, 0);
    put(group, new BoxGeometry(0.22, 0.09, 0.02), basic('#38d6ff'), 0, 0.73, 0.135);
    const antenna = put(group, new CylinderGeometry(0.012, 0.012, 0.18, 6), ink, 0, 0.92, 0);
    const bulb = put(group, new SphereGeometry(0.035, 10, 8), basic('#5ef2b0'), 0, 1.02, 0);
    for (const sx of [-0.13, 0.13]) put(group, new CylinderGeometry(0.07, 0.07, 0.08, 12), ink, sx, 0.2, 0).rotation.z = Math.PI / 2;
    let jump = -10;
    let now = 0;
    const entry = register(
      {
        id: name,
        segment,
        x: loop[0].x,
        z: loop[0].z,
        reach: 2.4,
        title: { fr: `Saluer ${name}`, en: `Greet ${name}` },
        animate: (time, visitor) => {
          now = time;
          const near = visitor && Math.hypot(visitor.x - entry.x, visitor.z - entry.z) < 2.6;
          if (!near) {
            // en patrouille ; le temps propre de l'agent s'arrête quand il discute
            entry.clock = (entry.clock || 0) + Math.min(0.1, time - (entry.last || time));
            const p = patrolPoint(loop, entry.clock, 0.9);
            entry.x = p.x;
            entry.z = p.z;
            group.rotation.y = p.heading;
          } else {
            group.rotation.y = Math.atan2(visitor.x - entry.x, visitor.z - entry.z);
          }
          entry.last = time;
          const hop = time - jump < 0.6 ? Math.abs(Math.sin((time - jump) * 10)) * 0.25 : 0;
          group.position.set(entry.x, hop + 0.02 * Math.sin(time * 6), entry.z);
          antenna.rotation.z = near ? 0.4 * Math.sin(time * 9) : 0;
          bulb.position.x = near ? 0.03 * Math.sin(time * 9) : 0;
        },
        interact: () => {
          jump = now;
          return line ? `say:${name} · ${localize(line.text, currentLang)}` : 'hello';
        },
      },
      group,
    );
    group.position.set(loop[0].x, 0, loop[0].z);
  };
  const ring = (zRoom, inset) => [
    { x: -1.9, z: zRoom - inset },
    { x: 1.9, z: zRoom - inset },
    { x: 1.9, z: zRoom - ROOM_DEPTH + inset },
    { x: -1.9, z: zRoom - ROOM_DEPTH + inset },
  ];
  robot('agent-plan', 0, [{ x: -2.2, z: 1.2 }, { x: 2.2, z: 1.2 }, { x: 2.2, z: 5.4 }, { x: -2.2, z: 5.4 }], '#1d3b53');
  if (count > 0) robot('agent-data', 1, ring(0, 2.4), '#5b6fc0');
  if (count > 2) robot('agent-code', 3, ring(-2 * ROOM_DEPTH, 2.4), '#2f5d46');
  if (count > 3) robot('agent-qa', 4, ring(-3 * ROOM_DEPTH, 2.2), '#8a5a2b');

  // ---------- salle 3 : les jauges de preuves et la maquette du site ----------
  if (count > 2) {
    const zRoom = -2 * ROOM_DEPTH;
    const skills = content.skills || [];
    skills.slice(0, 5).forEach((skill, i) => {
      const group = new Group();
      const x = 4.35;
      const z = zRoom - 0.9 - i * 0.95;
      group.position.set(x, 0, z);
      put(group, new CylinderGeometry(0.2, 0.24, 0.12, 16), ink, 0, 0.06, 0);
      put(group, new CylinderGeometry(0.14, 0.14, 1.5, 16), mat('#cfe9f5', { transparent: true, opacity: 0.28 }), 0, 0.87, 0);
      const liquid = put(group, new CylinderGeometry(0.115, 0.115, 1.44, 16), basic(i % 2 ? '#5ef2b0' : '#38d6ff'), 0, 0.87, 0);
      put(group, new CylinderGeometry(0.17, 0.17, 0.05, 16), gold, 0, 1.645, 0);
      const label = canvasTexture(512, 128);
      const drawLabel = (l) => {
        const { ctx } = label;
        ctx.fillStyle = '#0b1118';
        ctx.fillRect(0, 0, 512, 128);
        ctx.strokeStyle = '#c9a24a';
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, 504, 120);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f4f1ea';
        let size = 34;
        do {
          ctx.font = `400 ${size}px ${SERIF}`;
          size -= 2;
        } while (ctx.measureText(localize(skill.label, l)).width > 480 && size > 14);
        ctx.fillText(localize(skill.label, l), 256, 42);
        ctx.fillStyle = '#c9a24a';
        size = 22;
        do {
          ctx.font = `italic 400 ${size}px ${SERIF}`;
          size -= 1;
        } while (ctx.measureText(localize(skill.did, l)).width > 480 && size > 11);
        ctx.fillText(localize(skill.did, l), 256, 90);
        label.tex.needsUpdate = true;
      };
      drawLabel(lang);
      const plate = put(group, new PlaneGeometry(0.9, 0.225), basic('#ffffff', { map: label.tex }), -0.02, 1.95 + (i % 2) * 0.27, 0);
      plate.rotation.y = -Math.PI / 2;
      let fill = 0;
      register(
        {
          id: `preuve-${i}`,
          segment: 3,
          x,
          z,
          reach: 2.3,
          counts: false,
          title: { fr: `Voir la preuve : ${localize(skill.label, 'fr')}`, en: `See the proof: ${localize(skill.label, 'en')}` },
          animate: (time, visitor) => {
            // la jauge se remplit quand le visiteur s'approche : la preuve est derrière
            const near = visitor && Math.hypot(visitor.x - x, visitor.z - z) < 3.4;
            fill += ((near ? 1 : 0.12) - fill) * 0.06;
            liquid.scale.y = Math.max(0.02, fill);
            liquid.position.y = 0.15 + 0.72 * fill;
          },
          interact: () => `goto:${skill.proofPainting}`,
          setLang: drawLabel,
        },
        group,
      );
    });

    // la maquette du site : redessinée en code, elle ne reprend aucune image du vrai site
    const screen = new Group();
    screen.position.set(-4.92, 2.15, zRoom - 9.2);
    screen.rotation.y = Math.PI / 2;
    put(screen, new BoxGeometry(3.3, 1.95, 0.08), ink, 0, 0, 0);
    const site = canvasTexture(640, 360);
    put(screen, new PlaneGeometry(3.14, 1.77), basic('#ffffff', { map: site.tex }), 0, 0, 0.045);
    let lastSite = -1;
    const drawSite = (time) => {
      const { ctx } = site;
      const scroll = (Math.sin(time * 0.35) * 0.5 + 0.5) * 220;
      ctx.fillStyle = '#f7fafc';
      ctx.fillRect(0, 0, 640, 360);
      ctx.save();
      ctx.translate(0, 34 - scroll);
      const sea = ctx.createLinearGradient(0, 0, 0, 240);
      sea.addColorStop(0, '#0e3a5a');
      sea.addColorStop(1, '#1f7a9c');
      ctx.fillStyle = sea;
      ctx.fillRect(0, 0, 640, 240);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      for (let band = 0; band < 3; band++) {
        ctx.beginPath();
        ctx.moveTo(0, 240);
        for (let x = 0; x <= 640; x += 16) ctx.lineTo(x, 170 + band * 22 + Math.sin(x * 0.02 + time * (1 + band * 0.4) + band) * 12);
        ctx.lineTo(640, 240);
        ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(48, 70, 300, 26);
      ctx.fillRect(48, 108, 220, 14);
      ctx.fillStyle = '#f0c860';
      ctx.fillRect(48, 140, 120, 34);
      for (let card = 0; card < 3; card++) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(40 + card * 195, 270, 170, 130);
        ctx.strokeStyle = '#d6e2ea';
        ctx.strokeRect(40 + card * 195, 270, 170, 130);
        ctx.fillStyle = '#1f7a9c';
        ctx.fillRect(56 + card * 195, 286, 46, 46);
        ctx.fillStyle = '#b8c7d2';
        ctx.fillRect(56 + card * 195, 346, 130, 10);
        ctx.fillRect(56 + card * 195, 366, 96, 10);
      }
      ctx.fillStyle = '#0e3a5a';
      ctx.fillRect(0, 440, 640, 120);
      ctx.restore();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 640, 34);
      ctx.fillStyle = '#0e3a5a';
      ctx.font = `700 15px ${MONO}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText('new.tethys.cool', 16, 18);
      ctx.fillStyle = '#b8c7d2';
      for (let item = 0; item < 4; item++) ctx.fillRect(400 + item * 58, 13, 42, 9);
      site.tex.needsUpdate = true;
    };
    drawSite(0);
    register(
      {
        id: 'site-tethys',
        segment: 3,
        x: -4.3,
        z: zRoom - 9.2,
        reach: 3.2,
        title: { fr: 'Ouvrir le projet Tethys', en: 'Open the Tethys project' },
        animate: (time) => {
          if (time - lastSite < 0.08) return;
          lastSite = time;
          drawSite(time);
        },
        interact: () => 'panel:tethys',
      },
      screen,
    );
  }

  // ---------- salle 4 : l'atelier d'horloger ----------
  if (count > 3) {
    const zRoom = -3 * ROOM_DEPTH;
    const bench = new Group();
    bench.position.set(-3.7, 0, zRoom - 9.6);
    bench.rotation.y = Math.PI / 2 - 0.25;
    put(bench, new BoxGeometry(1.9, 0.08, 0.8), wood, 0, 0.86, 0);
    for (const [lx, lz] of [[-0.85, -0.32], [0.85, -0.32], [-0.85, 0.32], [0.85, 0.32]]) put(bench, new BoxGeometry(0.07, 0.86, 0.07), wood, lx, 0.43, lz);
    put(bench, new BoxGeometry(1.9, 0.5, 0.05), wood, 0, 1.15, -0.38);
    // une lampe d'établi, une loupe, des rouages épars
    put(bench, new CylinderGeometry(0.02, 0.02, 0.5, 8), ink, -0.6, 1.15, -0.2).rotation.z = 0.4;
    put(bench, new SphereGeometry(0.09, 12, 8), basic('#fff2a8'), -0.5, 1.38, -0.2);
    put(bench, new TorusGeometry(0.1, 0.015, 8, 20), gold, 0.5, 0.95, 0.1).rotation.x = Math.PI / 2;
    const cogs = [];
    for (const [cx, cz, r] of [[0, 0.05, 0.11], [0.2, -0.12, 0.07], [-0.22, 0.14, 0.05]]) {
      const cog = put(bench, new CylinderGeometry(r, r, 0.02, 10), gold, cx, 0.92, cz);
      cogs.push(cog);
    }
    register(
      {
        id: 'etabli',
        decor: true,
        segment: 4,
        x: -3.7,
        z: zRoom - 9.6,
        radius: 1.05,
        reach: 0,
        animate: (time) => cogs.forEach((cog, i) => (cog.rotation.y = time * (i % 2 ? -1.6 : 1.1))),
      },
      bench,
    );

    // deux vitrines : une montre sous verre dans chacune
    for (const [vx, vz] of [[3.9, zRoom - 1.3], [2.6, zRoom - 11.0]]) {
      const cabinet = new Group();
      cabinet.position.set(vx, 0, vz);
      put(cabinet, new BoxGeometry(0.7, 0.95, 0.7), mat('#22352c'), 0, 0.475, 0);
      put(cabinet, new BoxGeometry(0.66, 0.6, 0.66), mat('#dff1f7', { transparent: true, opacity: 0.22 }), 0, 1.27, 0);
      const dial = put(cabinet, new CylinderGeometry(0.16, 0.16, 0.04, 28), gold, 0, 1.2, 0);
      dial.rotation.x = Math.PI / 2 - 0.4;
      put(cabinet, new CylinderGeometry(0.13, 0.13, 0.045, 28), basic('#fbf6e6'), 0, 1.2, 0).rotation.x = Math.PI / 2 - 0.4;
      register({ id: `vitrine-${props.length}`, decor: true, segment: 4, x: vx, z: vz, radius: 0.55, reach: 0, animate: (time) => (dial.rotation.z = Math.sin(time * 0.6) * 0.1) }, cabinet);
    }
  }

  // les textes des agents suivent la langue
  props.push({ id: 'langue', decor: true, segment: -1, x: 0, z: 0, radius: 0, reach: 0, meshes: [], animate() {}, interact: () => null, setLang: (next) => (currentLang = next) });

  return props;
}
