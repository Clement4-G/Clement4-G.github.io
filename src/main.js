import content from '../content/site.json';
import chessPuzzle from '../content/chess-puzzle.json';
import './fast/fast.css';
import { localize } from './content.js';
import { detectLang, safeStorage } from './i18n.js';
import { renderFast, renderLoader } from './fast/render.js';
import { revealEmail } from './contact.js';
import { createPainting } from './paintings/index.js';
import { mountChessBoard } from './chess/board.js';
import { chooseMode, detectWebGL } from './capabilities.js';
import { runInitChain } from './boot.js';
import { resolveReducedMotion } from './motion.js';
import { loaderWait } from './loader-timing.js';

const store = safeStorage('local');
const fastEl = document.getElementById('fast');
const museumEl = document.getElementById('museum');
const langToggle = document.getElementById('lang-toggle');
const modeToggle = document.getElementById('mode-toggle');
const motionToggle = document.getElementById('motion-toggle');
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = {
  lang: detectLang({
    search: window.location.search,
    stored: store.get('lang'),
    navigatorLang: navigator.language,
  }),
  reducedMotion: resolveReducedMotion({ prefersReduced, stored: store.get('motion'), search: window.location.search }),
  mode: 'fast',
  museum: null,
};

document.documentElement.dataset.motion = state.reducedMotion ? 'reduced' : 'full';

// --- l'écran de chargement : lisible à la première visite, effacé dès que tout est prêt ensuite ---
const loaderEl = document.getElementById('loader');
let revealLoader;
const loaderGone = new Promise((resolve) => {
  revealLoader = resolve;
});

// un clic ou une touche est écouté dès l'affichage : si le site n'est pas encore prêt, il part dès qu'il l'est
let skipRequested = false;
let wantFast = false;
let goNow = null;
const requestSkip = () => {
  skipRequested = true;
  if (goNow) goNow();
};
if (loaderEl) {
  loaderEl.addEventListener('click', (event) => {
    if (event.target.closest?.('[data-loader-fast]')) {
      wantFast = true;
      store.set('mode', 'fast');
    }
    requestSkip();
  });
  window.addEventListener('keydown', requestSkip);
}

function dismissLoader() {
  if (!loaderEl || loaderEl.dataset.out) {
    revealLoader();
    return;
  }
  const session = safeStorage('session');
  const first = !session.get('loaderSeen');
  session.set('loaderSeen', '1');
  // à la première visite, l'écran reste le temps de lire (voir loader-timing.js) ; « Entrer » abrège
  const museumShown = state.mode === 'museum';
  const fastButton = loaderEl.querySelector('[data-loader-fast]');
  if (fastButton) fastButton.hidden = !museumShown;
  const wait = loaderWait({ first, skipped: skipRequested, now: performance.now() });
  if (wait > 0) {
    // la barre se remplit pendant l'attente : on voit que ça avance
    loaderEl.style.setProperty('--loader-ms', `${Math.round(wait)}ms`);
    loaderEl.classList.add('loader--timed');
  }
  let timer = null;
  const go = () => {
    if (loaderEl.dataset.out) return;
    loaderEl.dataset.out = '1';
    clearTimeout(timer);
    window.removeEventListener('keydown', requestSkip);
    if (wantFast && state.mode === 'museum') fallbackToFast();
    loaderEl.classList.add('loader--out');
    revealLoader();
    setTimeout(() => loaderEl.remove(), state.reducedMotion ? 0 : 700);
  };
  goNow = go;
  timer = setTimeout(go, wait);
}

// En version rapide, les liens directs (?salle=, ?tableau=, ?vue=) mènent à l'endroit demandé.
function followFastLink() {
  if (state.mode !== 'fast') return;
  const params = new URLSearchParams(window.location.search);
  const painting = params.get('tableau') || params.get('vue');
  const room = params.get('salle');
  const target = (painting && /^[\w-]+$/.test(painting) && document.getElementById(`painting-${painting}`)) || (room && /^[\w-]+$/.test(room) && document.getElementById(`room-${room}`));
  if (target) target.scrollIntoView();
}

const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

// Échiquier jouable à la souris ou au clavier ; position fixe et solution écrite
// sur écran tactile ou quand le visiteur a demandé moins d'animations.
function mountChess(slot) {
  const t = (key) => localize(content.ui[key], state.lang);
  try {
    mountChessBoard(
      slot,
      chessPuzzle,
      {
        prompt: t('chessPrompt'),
        wrong: t('chessWrong'),
        solved: t('chessSolved'),
        reset: t('chessReset'),
        solution: t('chessSolution'),
        credit: t('chessCredit'),
      },
      { interactive: !state.reducedMotion && !coarsePointer },
    );
  } catch (error) {
    console.warn('Échiquier non affiché', error);
  }
}

// Branche les éléments vivants d'un bloc de contenu (version rapide ou panneau du musée).
// Renvoie une fonction qui arrête ce qui tourne.
function bindContent(root) {
  for (const button of root.querySelectorAll('[data-email-button]')) {
    revealEmail(button, content.links.email);
  }
  for (const slot of root.querySelectorAll('[data-chess]')) mountChess(slot);
  return () => {};
}

let fastPaintings = [];
let paintingObserver = null;
let preloadObserver = null;
let unbindFast = () => {};
let revealObserver = null;

// Les tableaux ne s'animent que lorsqu'ils sont visibles à l'écran.
function mountFastPaintings() {
  for (const painting of fastPaintings) painting.stop();
  fastPaintings = [];
  if (paintingObserver) paintingObserver.disconnect();
  if (preloadObserver) preloadObserver.disconnect();
  const byCanvas = new Map();
  // les œuvres se téléchargent un peu avant d'arriver à l'écran : on ne voit jamais l'image apparaître d'un coup
  preloadObserver =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              byCanvas.get(entry.target)?.load();
              preloadObserver.unobserve(entry.target);
            }
          },
          { rootMargin: '0px 0px 1200px 0px' },
        )
      : null;
  paintingObserver =
    'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => {
          for (const entry of entries) {
            const painting = byCanvas.get(entry.target);
            if (!painting) continue;
            if (entry.isIntersecting) painting.start();
            else painting.stop();
          }
        })
      : null;
  for (const canvas of fastEl.querySelectorAll('canvas[data-art]')) {
    try {
      const painting = createPainting(canvas.dataset.art, canvas, { reducedMotion: state.reducedMotion, work: canvas.dataset.work });
      painting.drawStill();
      fastPaintings.push(painting);
      byCanvas.set(canvas, painting);
      if (paintingObserver) paintingObserver.observe(canvas);
      if (preloadObserver) preloadObserver.observe(canvas);
      else painting.load();
    } catch (error) {
      console.warn('Tableau non affiché', canvas.dataset.art, error);
    }
  }
}

// Branche tout ce qui vit dans la version rapide. Rappelée à chaque changement de langue.
function bindFast() {
  unbindFast();
  mountFastPaintings();
  unbindFast = bindContent(fastEl);
  if (!state.reducedMotion && 'IntersectionObserver' in window) {
    fastEl.classList.add('is-animated');
    // un seul observateur, remplacé à chaque nouveau rendu (changement de langue)
    if (revealObserver) revealObserver.disconnect();
    revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    for (const el of fastEl.querySelectorAll('.painting, .room__head')) revealObserver.observe(el);
  }
}

function museumPossible() {
  return (
    chooseMode({
      webgl: detectWebGL(),
      width: window.innerWidth,
      coarsePointer,
      forcedFast: false,
    }) === 'museum'
  );
}

function forcedFast() {
  return new URLSearchParams(window.location.search).get('fast') === '1' || store.get('mode') === 'fast';
}

function setMode(mode) {
  state.mode = mode;
  document.documentElement.dataset.mode = mode;
  museumEl.hidden = mode !== 'museum';
  fastEl.hidden = mode === 'museum';
  modeToggle.textContent = localize(mode === 'museum' ? content.ui.fastVersion : content.ui.museumVersion, state.lang);
  // en version rapide, le bouton qui ramène au musée se voit tout de suite
  modeToggle.classList.toggle('btn--call', mode === 'fast');
  if (mode === 'fast') window.scrollTo(0, 0);
}

function stopMuseum() {
  if (state.museum) {
    try {
      state.museum.destroy();
    } catch (error) {
      console.warn('Arrêt du musée incomplet', error);
    }
    state.museum = null;
  }
  museumEl.replaceChildren();
}

// Toute panne grave du musée ramène à la version rapide, jamais à une page blanche.
function fallbackToFast(error) {
  // la panne ne doit jamais rester muette : elle s'écrit dans la console
  if (error instanceof Error) console.error('Musée interrompu, retour à la version rapide', error);
  stopMuseum();
  setMode('fast');
}

let starting = false;

async function startMuseum() {
  // deux clics rapides ne lancent pas deux musées
  if (starting) return;
  starting = true;
  try {
    await launchMuseum();
  } finally {
    starting = false;
  }
}

async function launchMuseum() {
  const result = await runInitChain([
    {
      name: 'musée',
      critical: true,
      run: async () => {
        const { mountMuseum } = await import('./museum.js');
        state.museum = await mountMuseum({
          root: museumEl,
          content,
          lang: state.lang,
          reducedMotion: state.reducedMotion,
          bindContent,
          onFatal: fallbackToFast,
          revealed: loaderGone,
        });
      },
    },
  ]);
  if (result.criticalFailed) fallbackToFast();
  else setMode('museum');
}

function applyLang(lang, { rerender }) {
  state.lang = lang;
  document.documentElement.lang = lang;
  langToggle.textContent = localize(content.ui.langToggle, lang);
  if (loaderEl && !loaderEl.dataset.out) loaderEl.innerHTML = renderLoader(content, lang);
  motionToggle.textContent = localize(state.reducedMotion ? content.ui.motionOn : content.ui.motionOff, lang);
  modeToggle.textContent = localize(state.mode === 'museum' ? content.ui.fastVersion : content.ui.museumVersion, lang);
  if (rerender) {
    fastEl.innerHTML = renderFast(content, lang);
    bindFast();
  }
  if (state.museum) state.museum.setLang(lang);
}

langToggle.hidden = false;
langToggle.addEventListener('click', () => {
  const next = state.lang === 'fr' ? 'en' : 'fr';
  store.set('lang', next);
  applyLang(next, { rerender: true });
});

// Le bouton n'apparaît que si le système coupe les animations, ou si le visiteur a déjà choisi.
motionToggle.hidden = !(prefersReduced || store.get('motion'));
motionToggle.classList.toggle('btn--call', state.reducedMotion);
motionToggle.addEventListener('click', () => {
  store.set('motion', state.reducedMotion ? 'on' : 'off');
  // le réglage choisi doit l'emporter sur un ?anim resté dans l'adresse
  const url = new URL(window.location.href);
  url.searchParams.delete('anim');
  window.location.replace(url.toString());
});

modeToggle.addEventListener('click', () => {
  if (starting) return;
  if (state.mode === 'museum') {
    store.set('mode', 'fast');
    fallbackToFast();
  } else {
    store.set('mode', 'museum');
    startMuseum();
  }
});

// La page arrive déjà rendue en français. Les étapes sont isolées : la version rapide
// (critique) passe d'abord, le musée ensuite s'il est possible.
runInitChain([
  {
    name: 'langue',
    critical: false,
    run: () => applyLang(state.lang, { rerender: state.lang !== 'fr' }),
  },
  {
    name: 'version rapide',
    critical: true,
    run: () => {
      if (state.lang === 'fr') bindFast();
    },
  },
  {
    name: 'choix du mode',
    critical: false,
    run: async () => {
      if (!museumPossible()) return;
      modeToggle.hidden = false;
      setMode('fast');
      if (!forcedFast()) await startMuseum();
    },
  },
])
  .catch((error) => console.error('Initialisation incomplète', error))
  .finally(() => {
    followFastLink();
    dismissLoader();
  });
