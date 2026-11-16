// La carte du musée : le sommaire du site. On la fait glisser, on zoome, on entre dans une salle.
import './map.css';
import { localize } from '../content.js';
import { createPainting } from '../paintings/index.js';
import { thumbUrl } from '../paintings/works.js';
import { GARDEN_BOX, MAP_H, MAP_W, ROOM_LAYOUT, ROOM_LINKS, clampView, doorGaps, gardenLines, linkPoints } from './layout.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg(tag, attrs = {}, text) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  if (text !== undefined) el.textContent = text;
  return el;
}

function html(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

export function mountMap(container, content, lang, { onEnterRoom }) {
  const root = html('div', 'map');
  const head = html('header', 'map__head');
  const short = html('p', 'map__short');
  const name = html('h1', 'map__name', content.identity.name);
  const tagline = html('p', 'map__tagline');
  head.append(short, name, tagline);

  const view = svg('svg', { class: 'map__svg', viewBox: `-70 -190 ${MAP_W + 400} ${MAP_H + 270}`, role: 'group' });
  const defs = svg('defs');
  const marker = svg('marker', { id: 'map-arrow', viewBox: '0 0 10 10', refX: '6', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' });
  marker.append(svg('path', { d: 'M0 0 L10 5 L0 10 z', class: 'map__arrowhead' }));
  const pattern = svg('pattern', { id: 'map-grid', width: '40', height: '40', patternUnits: 'userSpaceOnUse' });
  pattern.append(svg('path', { d: 'M40 0 H0 V40', class: 'map__gridline' }));
  defs.append(marker, pattern);
  const world = svg('g', { class: 'map__world' });
  world.append(svg('rect', { x: -MAP_W, y: -MAP_H, width: MAP_W * 3, height: MAP_H * 3, fill: 'url(#map-grid)' }));

  const links = ROOM_LINKS.map(([from, to]) => {
    const p = linkPoints(from, to);
    const line = svg('line', { ...p, class: 'map__link', 'marker-end': 'url(#map-arrow)', pathLength: '1' });
    world.append(line);
    return line;
  });

  const rooms = {};
  const paintings = [];
  const titles = {};
  for (const room of content.rooms) {
    const box = ROOM_LAYOUT[room.id];
    const group = svg('g', { class: 'map__room', tabindex: '0', role: 'button', 'data-room': room.id });
    group.append(svg('rect', { x: box.x, y: box.y, width: box.w, height: box.h, class: 'map__walls' }));
    // l'ouverture de la porte, en bas du mur
    // les portes s'ouvrent là où passent les flèches (et vers le jardin pour la salle de trading)
    const gaps = doorGaps(room.id);
    if (room.id === 'trading' && content.garden) gaps.push({ x1: box.x + box.w, y1: GARDEN_BOX.y + GARDEN_BOX.h / 2 - 26, x2: box.x + box.w, y2: GARDEN_BOX.y + GARDEN_BOX.h / 2 + 26 });
    for (const gap of gaps) group.append(svg('line', { ...gap, class: 'map__door' }));
    group.append(svg('text', { x: box.x + 24, y: box.y + 62, class: 'map__num' }, room.number));
    const title = svg('text', { x: box.x + 24, y: box.y + 100, class: 'map__title' });
    titles[room.id] = title;
    group.append(title);
    room.paintings.forEach((id, i) => {
      // chaque tableau apparaît en miniature sur la carte
      const fx = box.x + 24 + i * 92;
      const fy = box.y + 124;
      const frame = svg('g', { class: 'map__painting', 'data-painting': id });
      frame.append(svg('rect', { x: fx, y: fy, width: 76, height: 52, class: 'map__frame' }));
      try {
        const image = svg('image', { x: fx + 3, y: fy + 3, width: 70, height: 46, preserveAspectRatio: 'xMidYMid slice' });
        const work = content.paintings[id].work;
        if (work) image.setAttribute('href', thumbUrl(work.image));
        else {
          const thumb = document.createElement('canvas');
          thumb.width = 160;
          thumb.height = 110;
          createPainting(content.paintings[id].art, thumb, { reducedMotion: true }).drawStill();
          image.setAttribute('href', thumb.toDataURL('image/png'));
        }
        frame.append(image);
      } catch (error) {
        console.warn('Miniature non affichée', id, error);
      }
      paintings.push(frame);
      group.append(frame);
    });
    rooms[room.id] = group;
    world.append(group);
  }
  // le jardin : une cour verte reliée à la salle de trading
  let gardenLabel = null;
  if (content.garden && ROOM_LAYOUT.trading) {
    const b = GARDEN_BOX;
    const t = ROOM_LAYOUT.trading;
    const garden = svg('g', { class: 'map__garden' });
    garden.append(svg('line', { x1: t.x + t.w, y1: b.y + b.h / 2, x2: b.x, y2: b.y + b.h / 2, class: 'map__gardenlink' }));
    garden.append(svg('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 14, class: 'map__gardenbox' }));
    for (const [cx, cy, r] of [[b.x + 178, b.y + 96, 16], [b.x + 196, b.y + 114, 11], [b.x + 64, b.y + 100, 22]]) garden.append(svg('circle', { cx, cy, r, class: cx < b.x + 120 ? 'map__pond' : 'map__tree' }));
    gardenLabel = svg('text', { x: b.x + 18, y: b.y + 40, class: 'map__gardentitle' });
    garden.append(gardenLabel);
    world.append(garden);
  }
  view.append(defs, world);

  const hint = html('p', 'map__hint');
  root.append(view, head, hint);
  container.append(root);

  // --- glisser et zoomer ---
  let current = { x: 0, y: 0, scale: 1 };
  let drag = null;
  let moved = false;

  function applyView() {
    world.setAttribute(
      'transform',
      `translate(${current.x} ${current.y}) translate(${MAP_W / 2} ${MAP_H / 2}) scale(${current.scale}) translate(${-MAP_W / 2} ${-MAP_H / 2})`,
    );
  }

  // pixels d'écran → unités de la carte
  function unitsPerPixel() {
    const rect = view.getBoundingClientRect();
    return rect.width ? (MAP_W + 400) / rect.width : 1;
  }

  function onPointerDown(event) {
    drag = { px: event.clientX, py: event.clientY, x: current.x, y: current.y };
    moved = false;
  }
  function onPointerMove(event) {
    if (!drag) return;
    const dx = event.clientX - drag.px;
    const dy = event.clientY - drag.py;
    if (Math.hypot(dx, dy) > 5) moved = true;
    if (!moved) return;
    const k = unitsPerPixel();
    current = clampView({ x: drag.x + dx * k, y: drag.y + dy * k, scale: current.scale });
    applyView();
  }
  function onPointerUp() {
    drag = null;
  }
  function onWheel(event) {
    event.preventDefault();
    current = clampView({ ...current, scale: current.scale * (event.deltaY < 0 ? 1.12 : 0.89) });
    applyView();
  }
  function enter(event) {
    const group = event.target.closest?.('.map__room');
    if (!group) return;
    if (event.type === 'click' && moved) return; // c'était un glisser, pas un clic
    if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onEnterRoom(group.dataset.room);
  }

  view.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  view.addEventListener('wheel', onWheel, { passive: false });
  view.addEventListener('click', enter);
  view.addEventListener('keydown', enter);

  function setLang(next) {
    short.textContent = localize(content.identity.short, next);
    tagline.textContent = localize(content.identity.tagline, next);
    hint.textContent = localize(content.ui.mapHint, next);
    if (gardenLabel) {
      // deux lignes : le nom du jardin, puis « bonus » en plus petit
      gardenLabel.replaceChildren(...gardenLines(content.garden.number, localize(content.garden.title, next)).map((text, i) => {
        const span = svg('tspan', { x: GARDEN_BOX.x + 18, dy: i ? 22 : 0, class: i ? 'map__gardentag' : '' });
        span.textContent = text;
        return span;
      }));
    }
    for (const room of content.rooms) {
      titles[room.id].textContent = localize(room.title, next);
      rooms[room.id].setAttribute('aria-label', `${room.number} ${localize(room.title, next)} : ${localize(content.ui.enterRoom, next)}`);
    }
  }

  setLang(lang);
  applyView();

  return {
    el: root,
    elements: { rooms, links, paintings, head, hint },
    show() {
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
    },
    setLang,
    // centre de la salle en proportion de l'écran, pour la plongée vers la galerie
    roomCenter(roomId) {
      const rect = rooms[roomId].querySelector('.map__walls').getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    },
    destroy() {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      root.remove();
    },
  };
}
