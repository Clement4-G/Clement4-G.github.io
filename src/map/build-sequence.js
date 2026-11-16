// La séquence d'ouverture : des agents construisent le musée sous les yeux du visiteur.
// C'est une animation écrite à l'avance, et un cartel le dit.
import { gsap } from 'gsap';
import { CURSOR_COLORS, assignCursors } from './cursors.js';

function logLine(entry) {
  const line = document.createElement('p');
  line.className = 'log__line';
  const agent = document.createElement('span');
  agent.className = 'log__agent';
  agent.textContent = `▸ ${entry.agent}`;
  line.append(agent, document.createTextNode(` : ${entry.text}`));
  return line;
}

// entries : [{ agent, text }] déjà dans la bonne langue.
// cursorsMove : les curseurs se promènent une fois la carte construite (faux si le visiteur réduit les animations)
export function playBuildSequence(map, logEl, entries, { reducedMotion, onDone, cursorsMove = !reducedMotion }) {
  const { rooms, links, paintings } = map.elements;
  const roomEls = Object.values(rooms);
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    onDone();
  };

  // --- les curseurs des agents : une flèche de couleur et un nom par agent ---
  const agents = [...new Set(entries.map((entry) => entry.agent))];
  const layer = document.createElement('div');
  layer.className = 'cursors';
  layer.setAttribute('aria-hidden', 'true');
  const cursors = {};
  agents.forEach((agent, i) => {
    const cursor = document.createElement('div');
    cursor.className = 'cursor';
    cursor.style.setProperty('--cursor', CURSOR_COLORS[i % CURSOR_COLORS.length]);
    const arrow = document.createElement('i');
    const name = document.createElement('span');
    name.textContent = agent;
    cursor.append(arrow, name);
    layer.append(cursor);
    cursors[agent] = cursor;
  });
  const previous = map.el.querySelector('.cursors');
  if (previous) {
    // on arrête les promenades des anciens curseurs avant de les remplacer
    gsap.killTweensOf([...previous.children]);
    previous.remove();
  }
  map.el.append(layer);
  const targets = { rooms: roomEls, paintings, links };
  const plan = assignCursors(agents, { rooms: roomEls.length, paintings: paintings.length, links: links.length });
  // position d'un élément de la carte, dans le repère de la carte
  // les curseurs se posent dans le coin bas d'une salle, jamais sur son titre
  const spot = (el) => {
    const box = el.getBoundingClientRect();
    const base = map.el.getBoundingClientRect();
    const room = roomEls.includes(el);
    return { x: box.left - base.left + box.width * (room ? 0.8 : 0.55), y: box.top - base.top + box.height * (room ? 0.86 : 0.55) };
  };
  const park = () => {
    // on arrête d'abord les promenades en cours, puis on range, puis on les relance
    gsap.killTweensOf(Object.values(cursors));
    plan.forEach((item) => {
      const p = spot(targets[item.kind][item.index]);
      gsap.set(cursors[item.agent], { x: p.x, y: p.y, opacity: 1 });
    });
  };
  // une fois la carte construite, les agents continuent de s'y promener
  const wander = () => {
    if (!cursorsMove) return;
    agents.forEach((agent, i) => {
      gsap.to(cursors[agent], {
        x: () => spot(roomEls[Math.floor(Math.random() * roomEls.length)]).x + (Math.random() - 0.5) * 50,
        y: () => spot(roomEls[Math.floor(Math.random() * roomEls.length)]).y + (Math.random() - 0.5) * 24,
        duration: 2.4 + i * 0.35,
        ease: 'sine.inOut',
        repeat: -1,
        repeatRefresh: true,
        repeatDelay: 0.6,
      });
    });
  };

  const showAllLines = () => {
    logEl.replaceChildren(...entries.map(logLine));
    logEl.scrollTop = logEl.scrollHeight;
  };

  if (reducedMotion) {
    showAllLines();
    park();
    wander();
    finish();
    return {
      skip() {},
      park: () => {
        park();
        wander();
      },
      destroy: () => gsap.killTweensOf(Object.values(cursors)),
    };
  }

  logEl.replaceChildren();
  gsap.set(roomEls, { opacity: 0, scale: 0.86, transformOrigin: '50% 50%' });
  gsap.set(paintings, { opacity: 0, y: -14 });
  gsap.set(links, { strokeDasharray: 1, strokeDashoffset: 1, opacity: 0 });

  const step = 0.72;
  const timeline = gsap.timeline({
    onComplete: () => {
      wander();
      finish();
    },
  });
  gsap.set(Object.values(cursors), { x: () => map.el.clientWidth * 0.5, y: () => map.el.clientHeight + 40, opacity: 0 });
  // chaque curseur file vers l'élément qu'il s'apprête à poser
  const arrival = { rooms: (i) => step * 2 + i * 0.5, paintings: (i) => step * 5 + i * 0.07, links: (i) => step * 6 + i * 0.18 };
  plan.forEach((item) => {
    const el = targets[item.kind][item.index];
    timeline.to(
      cursors[item.agent],
      { x: () => spot(el).x, y: () => spot(el).y, opacity: 1, duration: 0.42, ease: 'power2.out', overwrite: 'auto' },
      Math.max(0, arrival[item.kind](item.index) - 0.36),
    );
  });
  entries.forEach((entry, i) => {
    timeline.call(
      () => {
        logEl.append(logLine(entry));
        logEl.scrollTop = logEl.scrollHeight;
      },
      null,
      i * step,
    );
  });
  // les salles se posent une à une, puis les tableaux s'accrochent, puis les flèches se tracent
  roomEls.forEach((el, i) => {
    timeline.to(el, { opacity: 1, scale: 1, duration: 0.55, ease: 'back.out(1.6)' }, step * 2 + i * 0.5);
  });
  timeline.to(paintings, { opacity: 1, y: 0, duration: 0.4, stagger: 0.07, ease: 'power2.out' }, step * 5);
  timeline.to(links, { opacity: 1, strokeDashoffset: 0, duration: 0.5, stagger: 0.18, ease: 'power1.inOut' }, step * 6);
  timeline.to({}, { duration: 0.4 }, entries.length * step);

  return {
    park: () => {
      park();
      wander();
    },
    destroy: () => gsap.killTweensOf(Object.values(cursors)),
    skip() {
      if (finished) return;
      timeline.progress(1);
      showAllLines();
      // les éléments viennent d'apparaître d'un coup : on range les curseurs à leur place
      gsap.killTweensOf(Object.values(cursors));
      park();
      wander();
      finish();
    },
  };
}
