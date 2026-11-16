// Panneau de lecture : le contenu d'un tableau, lisible, par-dessus la galerie.
import { localize } from './content.js';
import { renderPainting } from './fast/render.js';
import { createPainting } from './paintings/index.js';

let open = null;

export function closePanel() {
  if (!open) return;
  const { overlay, cleanup, onClose, previousFocus } = open;
  open = null;
  cleanup();
  overlay.remove();
  if (previousFocus && previousFocus.focus) previousFocus.focus();
  if (onClose) onClose();
}

export function openPanel(paintingId, content, lang, { host = document.body, bindContent, reducedMotion = false, onClose } = {}) {
  closePanel();
  const overlay = document.createElement('div');
  overlay.className = 'panel';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', localize(content.paintings[paintingId].title, lang));

  const sheet = document.createElement('div');
  sheet.className = 'panel__sheet';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'btn panel__close';
  close.textContent = localize(content.ui.close, lang);
  const body = document.createElement('div');
  body.className = 'panel__body';
  body.innerHTML = renderPainting(content, paintingId, lang);
  // le même tableau existe déjà dans la version rapide : pas deux fois le même identifiant
  body.querySelector('article')?.removeAttribute('id');
  // moins de lecture d'emblée : la première phrase, le reste se déplie
  const paragraphs = [...body.querySelectorAll('.painting__text > p:not([class])')].filter((p) => !p.querySelector('a'));
  if (paragraphs.length > 1) {
    const more = document.createElement('details');
    more.className = 'more';
    const summary = document.createElement('summary');
    summary.textContent = localize(content.ui.more, lang);
    paragraphs[1].before(more);
    more.append(summary, ...paragraphs.slice(1));
  }
  sheet.append(close, body);
  overlay.append(sheet);
  host.append(overlay);

  // le tableau continue de s'animer dans le panneau
  const paintings = [];
  for (const canvas of body.querySelectorAll('canvas[data-art]')) {
    try {
      const painting = createPainting(canvas.dataset.art, canvas, { reducedMotion, work: canvas.dataset.work });
      painting.start();
      paintings.push(painting);
    } catch (error) {
      console.warn('Tableau non affiché', error);
    }
  }
  const unbind = bindContent ? bindContent(body) : () => {};

  const focusables = () => [...sheet.querySelectorAll('a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')];
  const onKey = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closePanel();
      return;
    }
    if (event.key !== 'Tab') return;
    // le focus reste dans le panneau tant qu'il est ouvert
    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  const onBackdrop = (event) => {
    if (event.target === overlay) closePanel();
  };
  document.addEventListener('keydown', onKey, true);
  overlay.addEventListener('click', onBackdrop);
  close.addEventListener('click', closePanel);

  open = {
    overlay,
    onClose,
    previousFocus: document.activeElement,
    cleanup() {
      document.removeEventListener('keydown', onKey, true);
      for (const painting of paintings) painting.stop();
      unbind();
    },
  };
  close.focus();
}
