// Le musée : la carte (sommaire) puis la galerie 3D. Chargé seulement si la machine le permet.
import { gsap } from 'gsap';
import './gallery/gallery.css';
import { localize } from './content.js';
import { safeStorage } from './i18n.js';
import { createTransitionLock } from './transition.js';
import { mountMap } from './map/map.js';
import { playBuildSequence } from './map/build-sequence.js';
import { shouldPlaySequence } from './map/sequence-state.js';
import { closePanel, openPanel } from './panel.js';
import { createQuest, piecePlaces } from './gallery/quest.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export async function mountMuseum({ root, content, lang, reducedMotion, bindContent, onFatal, revealed = Promise.resolve() }) {
  const lock = createTransitionLock();
  let currentLang = lang;
  let gallery = null;
  let currentRoom = null;
  let destroyed = false;
  // la quête des six pièces : sa progression tient le temps de la session
  const session = safeStorage('session');
  const quest = createQuest(piecePlaces(content.rooms.length).map((p) => p.id), session.get('quest'));
  let facing = null;
  // réglages du regard, gardés d'une visite à l'autre
  const prefs = safeStorage('local');
  let look = { sensitivity: 1, invertX: false, invertY: false };
  try {
    look = { ...look, ...JSON.parse(prefs.get('look') || '{}') };
  } catch {
    // réglages illisibles : on garde ceux par défaut
  }
  const tried = new Set();
  let curioTotal = 0;
  let toastTimer = null;
  root.replaceChildren();

  const map = mountMap(root, content, currentLang, { onEnterRoom: (roomId) => enterRoom(roomId) });

  // --- panneau sombre : le journal des agents ---
  const log = el('aside', 'log');
  const logTitle = el('p', 'log__title');
  const logTitleText = el('span');
  logTitle.append(el('span', 'log__dot'), logTitleText);
  const logLines = el('div', 'log__lines');
  const notice = el('p', 'log__notice');
  const skip = el('button', 'log__skip');
  skip.type = 'button';
  log.append(logTitle, logLines, notice, skip);
  // l'appel à l'action principal de la carte
  const cta = el('button', 'btn map__cta');
  cta.type = 'button';
  // « Commencer la visite » fait entrer par le hall ; un clic sur une salle y mène directement
  cta.addEventListener('click', () => enterRoom(content.rooms[0].id, true));
  map.el.append(log, cta);

  // --- la galerie et son habillage ---
  const galleryEl = el('div', 'gallery');
  galleryEl.hidden = true;
  const canvas = el('canvas', 'gallery__canvas');
  canvas.tabIndex = 0;
  const hud = el('div', 'hud');
  const back = el('button', 'btn');
  back.type = 'button';
  const roomLabel = el('p', 'hud__room');
  roomLabel.style.margin = '0';
  const questChip = el('p', 'hud__quest');
  const curioChip = el('p', 'hud__quest');
  const gear = el('button', 'btn hud__gear', '⚙\uFE0E');
  gear.type = 'button';
  // les compteurs du jeu sont rangés sous un repère « Bonus » : le portfolio d'abord, le jeu ensuite
  const bonusGroup = el('div', 'hud__bonus');
  const bonusLabel = el('span', 'hud__bonuslabel');
  bonusGroup.append(bonusLabel, questChip, curioChip);
  // le contact reste à un clic, dans chaque salle
  const contactBtn = el('button', 'btn hud__contact');
  contactBtn.type = 'button';
  hud.append(back, roomLabel, contactBtn, bonusGroup, gear);
  const settings = el('form', 'settings');
  settings.hidden = true;
  const field = (type, key) => {
    const label = el('label', 'settings__row');
    const text = el('span');
    const input = document.createElement('input');
    input.type = type;
    if (type === 'range') {
      input.min = '0.3';
      input.max = '3';
      input.step = '0.1';
      input.value = String(look.sensitivity);
    } else input.checked = Boolean(look[key]);
    input.addEventListener('input', () => {
      look = { ...look, [key]: type === 'range' ? Number(input.value) : input.checked };
      prefs.set('look', JSON.stringify(look));
      if (gallery) gallery.setLook(look);
    });
    label.append(text, input);
    settings.append(label);
    return text;
  };
  const settingsTitle = el('p', 'settings__title');
  settings.append(settingsTitle);
  const sensitivityText = field('range', 'sensitivity');
  const invertYText = field('checkbox', 'invertY');
  const invertXText = field('checkbox', 'invertX');
  settings.addEventListener('submit', (event) => event.preventDefault());
  gear.addEventListener('click', () => {
    settings.hidden = !settings.hidden;
  });
  const slash = el('div', 'slash');
  slash.setAttribute('aria-hidden', 'true');
  slash.append(el('i'), el('b'), el('b'), el('b'));
  // le voile de transition : une grille de carreaux, à la manière des grilles échelonnées d'anime.js
  const VEIL_COLS = 16;
  const VEIL_ROWS = 9;
  const veil = el('div', 'veil');
  veil.setAttribute('aria-hidden', 'true');
  veil.style.setProperty('--veil-cols', String(VEIL_COLS));
  const tiles = Array.from({ length: VEIL_COLS * VEIL_ROWS }, () => el('i'));
  veil.append(...tiles);
  const toast = el('p', 'hud__toast');
  toast.setAttribute('role', 'status');
  toast.hidden = true;
  const prompt = el('button', 'hud__prompt');
  prompt.type = 'button';
  prompt.hidden = true;
  const card = el('div', 'roomcard');
  card.setAttribute('aria-hidden', 'true');
  const hint = el('p', 'hud__hint');
  const bar = el('div', 'hud__bar');
  const barFill = el('i');
  bar.append(barFill);
  galleryEl.append(canvas, hud, hint, bar, toast, prompt, card, slash, settings);
  root.append(veil);
  root.append(galleryEl);

  const entriesFor = (l) => content.agentsLog.map((e) => ({ agent: e.agent, text: localize(e.text, l) }));

  const findRoom = (roomId) => content.rooms.find((r) => r.id === roomId) || (roomId === 'secret' ? content.secret : roomId === 'jardin' ? content.garden : roomId === 'hall' ? content.hall : null);

  function showRoom(roomId) {
    currentRoom = roomId;
    const room = findRoom(roomId);
    if (!room) return;
    const num = el('span', 'hud__num', room.number);
    roomLabel.replaceChildren(num, document.createTextNode(localize(room.title, currentLang)));
  }

  // le carton de salle : le titre traverse l'écran à chaque changement de salle
  function announceRoom(roomId) {
    const changed = roomId !== currentRoom;
    showRoom(roomId);
    showHint();
    const room = findRoom(roomId);
    if (!room || !changed) return;
    card.replaceChildren(el('span', 'roomcard__num', room.number), el('span', 'roomcard__title', localize(room.title, currentLang)));
    card.classList.remove('is-on');
    void card.offsetWidth;
    card.classList.add('is-on');
  }

  // l'aide en bas d'écran suit la situation : à pied ou au volant
  function showHint() {
    hint.textContent = localize(gallery && gallery.isDriving() ? content.ui.driveHint : content.ui.galleryHint, currentLang);
  }

  function showQuest() {
    // un libellé visible plutôt qu'un symbole seul ; \uFE0E garde les symboles en texte (jamais en emoji)
    questChip.textContent = `♟\uFE0E ${localize(content.ui.questShort, currentLang)} ${quest.count}/${quest.total}`;
    questChip.classList.toggle('is-done', quest.complete);
    curioChip.textContent = `✦\uFE0E ${localize(content.ui.curioShort, currentLang)} ${tried.size}/${curioTotal}`;
    curioChip.classList.toggle('is-done', tried.size >= curioTotal);
  }

  function say(text, duration = 4200) {
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, duration);
  }

  function showPrompt() {
    prompt.hidden = !facing;
    if (!facing) return;
    const tag = facing.bonus ? `${localize(content.ui.bonus, currentLang)} · ` : facing.kind === 'painting' ? `${localize(content.ui.read, currentLang)} : ` : '';
    prompt.textContent = `E · ${tag}${localize(facing.title || content.paintings[facing.id].title, currentLang)}`;
  }

  function setTexts(l) {
    logTitleText.textContent = localize(content.ui.logTitle, l);
    notice.textContent = localize(content.ui.stagedNotice, l);
    skip.textContent = localize(content.ui.skip, l);
    cta.textContent = `${localize(content.ui.startVisit, l)} →`;
    back.textContent = `← ${localize(content.ui.backToMap, l)}`;
    showHint();
    gear.setAttribute('aria-label', localize(content.ui.settings, l));
    settingsTitle.textContent = localize(content.ui.settings, l);
    sensitivityText.textContent = localize(content.ui.sensitivity, l);
    invertYText.textContent = localize(content.ui.invertY, l);
    invertXText.textContent = localize(content.ui.invertX, l);
    canvas.setAttribute('aria-label', localize(content.ui.galleryHint, l));
    if (currentRoom) showRoom(currentRoom);
    showQuest();
    showPrompt();
    bonusLabel.textContent = localize(content.ui.bonus, l);
    contactBtn.textContent = localize(content.ui.contactCta, l);
  }
  setTexts(currentLang);

  // La séquence se joue une fois par session ; ensuite la carte s'affiche directement.
  const play = shouldPlaySequence(safeStorage('session'));
  // la construction par les agents ne commence qu'une fois l'écran de chargement levé : on la voit en entier
  let sequence = { skip() {}, park() {}, destroy() {} };
  let started = false;
  const startSequence = () => {
    if (started || destroyed) return;
    started = true;
    sequence = playBuildSequence(map, logLines, entriesFor(currentLang), {
      reducedMotion: reducedMotion || !play,
      cursorsMove: !reducedMotion,
      onDone: () => {
        skip.hidden = true;
      },
    });
  };
  revealed.then(startSequence, startSequence);

  // le panneau de contact s'ouvre sur place, sans déplacer le visiteur
  function openContact() {
    if (!gallery) return;
    gallery.setPaused(true);
    openPanel('contact', content, currentLang, {
      host: root,
      bindContent,
      reducedMotion,
      onClose: () => {
        if (gallery) gallery.setPaused(false);
        canvas.focus();
      },
    });
  }

  function openPainting(id) {
    // le contact s'ouvre sur place, où qu'on le demande : jamais de téléportation vers la salle 04
    if (id === 'contact') return openContact();
    if (!gallery) return;
    gallery.setPaused(true);
    gallery.goToPainting(id);
    showHint(); // on a pu descendre de la voiture en chemin
    openPanel(id, content, currentLang, {
      host: root,
      bindContent,
      reducedMotion,
      onClose: () => {
        if (gallery) gallery.setPaused(false);
        canvas.focus();
      },
    });
  }

  // La 3D n'est chargée qu'à la première entrée dans une salle : le premier écran reste léger.
  async function ensureGallery() {
    if (gallery) return gallery;
    const { mountGallery } = await import('./gallery/scene.js');
    // le visiteur a pu repasser en version rapide pendant le chargement : on ne crée rien
    if (destroyed) throw new Error('musée fermé pendant le chargement');
    gallery = mountGallery(
      canvas,
      content,
      {
        onOpenPainting: openPainting,
        onRoomChange: announceRoom,
        onFacing: (target) => {
          facing = target;
          showPrompt();
        },
        onInside: (id) => {
          hud.hidden = Boolean(id);
          hint.hidden = Boolean(id);
          if (!id) return;
          const work = content.paintings[id].work;
          say(`${localize(content.ui.inside, currentLang)} « ${localize(work.title, currentLang)} » · ${localize(content.ui.exitE, currentLang)}`, 6000);
        },
        onProp: (id, effect, counts, driving) => {
          if (effect !== 'grow' && counts !== false) tried.add(id);
          if (effect.startsWith('say:')) say(effect.slice(4), 5200);
          if (effect === 'drive') showHint();
          showQuest();
          if (effect === 'slash' && !reducedMotion) {
            slash.classList.remove('is-on');
            void slash.offsetWidth;
            slash.classList.add('is-on');
          }
          if (effect === 'late') say(localize(content.ui.late, currentLang), 3200);
        },
        onPiece: () => {
          session.set('quest', quest.serialize());
          showQuest();
          say(
            quest.complete
              ? localize(content.ui.questDone, currentLang)
              : `${localize(content.ui.questFound, currentLang)} · ${quest.count}/${quest.total}`,
            quest.complete ? 7000 : 3000,
          );
        },
        onProgress: (p) => {
          barFill.style.transform = `scaleX(${p.toFixed(4)})`;
        },
        onFatal,
      },
      { lang: currentLang, reducedMotion, quest, look },
    );
    curioTotal = gallery.curiosities;
    showQuest();
    return gallery;
  }

  function enterRoom(roomId, viaHall = false) {
    return lock.run(async () => {
      startSequence();
      sequence.skip();
      // le voile part de la salle cliquée et recouvre l'écran pendant que la galerie se charge
      const c = map.roomCenter(roomId);
      const box = root.getBoundingClientRect();
      const col = Math.min(VEIL_COLS - 1, Math.max(0, Math.floor(((c.x - box.left) / box.width) * VEIL_COLS)));
      const row = Math.min(VEIL_ROWS - 1, Math.max(0, Math.floor(((c.y - box.top) / box.height) * VEIL_ROWS)));
      const stagger = (amount) => ({ grid: [VEIL_ROWS, VEIL_COLS], from: row * VEIL_COLS + col, amount, ease: 'sine.inOut' });
      const cover = reducedMotion
        ? Promise.resolve()
        : gsap.fromTo(tiles, { scale: 0, opacity: 0 }, { scale: 1.04, opacity: 1, duration: 0.5, ease: 'sine.out', stagger: stagger(0.4) }).then(() => {});
      let g;
      try {
        [g] = await Promise.all([ensureGallery(), cover]);
      } catch (error) {
        gsap.set(tiles, { scale: 0, opacity: 0 });
        // le musée a été fermé pendant le chargement : ce n'est pas une panne, on ne touche à rien
        if (destroyed) return;
        onFatal(error);
        return;
      }
      if (destroyed) return;
      map.hide();
      sequence.destroy(); // les curseurs de la carte s'arrêtent pendant la visite ; ils repartent au retour
      galleryEl.hidden = false;
      gsap.set(galleryEl, { opacity: 1 }); // le retour à la carte l'avait rendue transparente
      await g.enter(roomId, { indoors: !viaHall });
      currentRoom = null;
      announceRoom(viaHall ? 'hall' : roomId);
      if (!quest.complete && quest.count === 0) say(localize(content.ui.questIntro, currentLang), 6500);
      canvas.focus();
      // puis il se retire du même point, et la salle apparaît ; on n'attend pas la fin du retrait :
      // le visiteur peut déjà agir, et un clic sur « Carte » n'est plus ignoré
      if (!reducedMotion) gsap.to(tiles, { scale: 0, opacity: 0, duration: 0.6, ease: 'sine.inOut', stagger: stagger(0.45) });
    });
  }

  function backToMap() {
    return lock.run(async () => {
      closePanel();
      if (!gallery) return;
      await gsap.to(galleryEl, { opacity: 0, duration: reducedMotion ? 0 : 0.35 });
      await gallery.exit();
      galleryEl.hidden = true;
      map.show();
      sequence.park(); // les curseurs retrouvent leur place maintenant que la carte est visible
      gsap.fromTo(map.el, { opacity: 0 }, { opacity: 1, duration: reducedMotion ? 0 : 0.35 });
    });
  }

  const onKey = (event) => {
    if (event.key === 'Escape') sequence.skip();
  };
  // dans un panneau, « voir la preuve » ouvre directement le tableau concerné
  const onProofClick = (event) => {
    const link = event.target.closest?.('[data-proof]');
    if (!link || !gallery) return;
    event.preventDefault();
    closePanel();
    openPainting(link.dataset.proof);
  };
  skip.addEventListener('click', () => sequence.skip());
  back.addEventListener('click', backToMap);
  contactBtn.addEventListener('click', openContact);
  prompt.addEventListener('click', () => {
    if (gallery) gallery.activate();
    canvas.focus();
  });
  root.addEventListener('click', onProofClick);
  window.addEventListener('keydown', onKey);

  // liens directs : ?salle=trading ouvre une salle, ?tableau=tethys ouvre un tableau
  const params = new URLSearchParams(window.location.search);
  // ?vue=<tableau> amène devant un tableau sans l'ouvrir
  const viewOnly = params.get('vue');
  const wantedPainting = params.get('tableau') || viewOnly;
  const paintingRoom = content.rooms.find((r) => r.paintings.includes(wantedPainting));
  const wantedRoom = paintingRoom ? paintingRoom.id : params.get('salle');
  if (wantedRoom && content.rooms.some((r) => r.id === wantedRoom)) {
    enterRoom(wantedRoom).then(() => {
      if (!paintingRoom || destroyed) return;
      if (viewOnly && gallery) gallery.goToPainting(wantedPainting);
      else openPainting(wantedPainting);
    });
  }

  return {
    setLang(next) {
      currentLang = next;
      closePanel();
      map.setLang(next);
      setTexts(next);
      sequence.skip();
      if (started) sequence = playBuildSequence(map, logLines, entriesFor(next), { reducedMotion: true, cursorsMove: !reducedMotion, onDone: () => {} });
      if (gallery) gallery.setLang(next);
    },
    destroy() {
      destroyed = true;
      clearTimeout(toastTimer);
      sequence.skip();
      sequence.destroy();
      closePanel();
      window.removeEventListener('keydown', onKey);
      root.removeEventListener('click', onProofClick);
      if (gallery) gallery.dispose();
      gallery = null;
      map.destroy();
      galleryEl.remove();
      veil.remove();
    },
  };
}
