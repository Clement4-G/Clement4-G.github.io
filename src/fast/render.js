// Version rapide : tout le contenu du site en HTML simple, sans 3D.
// Sert aussi de secours quand le musée ne peut pas démarrer, et de source
// pour le panneau de lecture d'un tableau dans la galerie.
import { localize } from '../content.js';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

function externalLink(href, label, className = '') {
  const cls = className ? ` class="${className}"` : '';
  return `<a${cls} href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

function emailButton(content, lang) {
  return `<button type="button" class="btn" data-email-button>${escapeHtml(localize(content.ui.showEmail, lang))}</button>`;
}

function contactLinks(content, lang) {
  return `<p class="links">${externalLink(content.links.linkedin, 'LinkedIn', 'btn')} ${externalLink(content.links.github, 'GitHub', 'btn')} ${emailButton(content, lang)}</p>`;
}

function skillsBlock(content, lang) {
  const t = (node) => escapeHtml(localize(node, lang));
  const items = content.skills
    .map(
      (s) => `<li class="skill"><span class="skill__label">${t(s.label)}</span><span class="skill__did">${t(s.did)}</span><a class="skill__proof" href="#painting-${escapeHtml(s.proofPainting)}" data-proof="${escapeHtml(s.proofPainting)}" aria-label="${t(s.label)} : ${t(content.ui.seeProof)}">${t(content.ui.seeProof)}</a></li>`,
    )
    .join('');
  const counters = content.counters
    .filter((c) => c.painting === 'stack')
    .map(
      (c) => `<div class="counter"><span class="counter__value">${Number(c.value)}</span><span class="counter__label">${t(c.label)}</span></div>`,
    )
    .join('');
  return `<div class="cockpit"><h4>${t(content.ui.skillsTitle)}</h4><ul class="skills">${items}</ul>${counters ? `<div class="counters">${counters}</div>` : ''}</div>`;
}

function aboutBlock(content, lang) {
  const t = (node) => escapeHtml(localize(node, lang));
  const education = content.education
    .map((e) => {
      const meta = [e.school, e.years].filter(Boolean).map(escapeHtml).join(' · ');
      return `<li><span class="edu__title">${t(e.title)}</span>${meta ? `<span class="edu__meta">${meta}</span>` : ''}</li>`;
    })
    .join('');
  const passions = content.passions.map((p) => `<li>${t(p)}</li>`).join('');
  return `<h4>${t(content.ui.education)}</h4><ul class="edu">${education}</ul><h4>${t(content.ui.passions)}</h4><ul class="passions">${passions}</ul><p>${externalLink(content.links.linkedin, localize(content.ui.experience, lang), 'btn')}</p>`;
}

function extrasFor(content, id, lang) {
  if (id === 'stack') return skillsBlock(content, lang);
  if (id === 'a-propos') return aboutBlock(content, lang);
  if (id === 'echiquier') return '<div class="chess" data-chess></div>';
  if (id === 'secret') return contactLinks(content, lang);
  if (id === 'contact') {
    const cli = content.ui.cliNotice
      ? `<p class="cli"><code>${escapeHtml(localize(content.ui.cliNotice, lang))}</code></p>`
      : '';
    return contactLinks(content, lang) + cli;
  }
  return '';
}

// number : numéro affiché ; par défaut, la place du tableau dans sa salle (03.2)
export function renderPainting(content, id, lang, { number: shown } = {}) {
  const p = content.paintings[id];
  const t = (node) => escapeHtml(localize(node, lang));
  const room = content.rooms.find((r) => r.paintings.includes(id));
  const number = shown ?? (room ? `${room.number}.${room.paintings.indexOf(id) + 1}` : '');
  const figure = p.figure ? `<p class="figure"><span class="figure__value">${t(p.figure.value)}</span><span class="figure__label">${t(p.figure.label)}</span></p>` : '';
  const body = p.body.map((para) => `<p>${t(para)}</p>`).join('');
  const tools = p.tools.length
    ? `<p class="tools"><span class="tools__label">${t(content.ui.tools)}</span>${p.tools.map((tool) => `<span class="chip">${escapeHtml(tool)}</span>`).join('')}</p>`
    : '';
  const link = p.link ? `<p>${externalLink(p.link, localize(content.ui.seeSite, lang), 'btn')}</p>` : '';
  const work = p.work;
  let cw = 640;
  let ch = 440;
  let cartel = '';
  if (work) {
    // le cadre garde les proportions de l'œuvre détournée
    if (work.w >= work.h) ch = Math.round((640 * work.h) / work.w);
    else {
      ch = 640;
      cw = Math.round((640 * work.w) / work.h);
    }
    const quoted = lang === 'en' ? `“${localize(work.title, lang)}”` : `« ${localize(work.title, lang)} »`;
    cartel = `<p class="painting__work">${escapeHtml(`${localize(content.ui.after, lang)} ${quoted}, ${localize(work.artist, lang)}, ${localize(work.year, lang)}`)}</p>`;
  }
  const workAttr = work ? ` data-work="${escapeHtml(work.image)}"` : '';
  return `<article id="painting-${escapeHtml(id)}" class="painting"><div class="painting__art"><canvas data-art="${escapeHtml(p.art)}"${workAttr} width="${cw}" height="${ch}" aria-hidden="true"></canvas>${cartel}</div><div class="painting__text"><p class="painting__num">${escapeHtml(number)}</p><h3>${t(p.title)}</h3>${figure}${body}${tools}${link}${extrasFor(content, id, lang)}</div></article>`;
}

// L'écran de chargement : une phrase sur le musée, une sur le choix de l'art.
export function renderLoader(content, lang) {
  const l = content.loader;
  if (!l) return '';
  const t = (node) => escapeHtml(localize(node, lang));
  return `<div class="loader__inner"><p class="loader__kicker">${escapeHtml(content.identity.name)} · Portfolio</p><p class="loader__title">${t(l.title)}</p><p class="loader__line">${t(l.line)}</p><p class="loader__why">${t(l.why)}</p><span class="loader__bar" aria-hidden="true"><i></i></span><p class="loader__actions"><button type="button" class="loader__enter" data-loader-enter>${t(content.ui.loaderEnter)} →</button><button type="button" class="loader__fast" data-loader-fast>${t(content.ui.fastVersion)}</button></p></div>`;
}

export function renderFast(content, lang) {
  const t = (node) => escapeHtml(localize(node, lang));
  const index = content.rooms
    .map((r) => `<li><a href="#room-${escapeHtml(r.id)}"><span class="index__num">${escapeHtml(r.number)}</span>${t(r.title)}</a></li>`)
    .join('');
  const indexLead = content.featured ? `<li><a href="#featured"><span class="index__num">★</span>${t(content.ui.featured)}</a></li>` : '';
  // la réalisation phare ouvre la page ; elle n'est pas répétée dans sa salle
  const featured = content.featured && content.paintings[content.featured] ? content.featured : null;
  const lead = featured
    ? `<section id="featured" class="room room--featured"><header class="room__head"><span class="room__num">★</span><h2>${t(content.ui.featured)}</h2></header>${renderPainting(content, featured, lang, { number: '★' })}</section>`
    : '';
  const offers = (content.offers || []).length
    ? `<div class="offers"><p class="offers__title">${t(content.ui.offersTitle)}</p><ul>${content.offers.map((offer) => `<li>${t(offer)}</li>`).join('')}</ul></div>`
    : '';
  const rooms = content.rooms
    .map(
      (r) => `<section id="room-${escapeHtml(r.id)}" class="room"><header class="room__head"><span class="room__num">${escapeHtml(r.number)}</span><h2>${t(r.title)}</h2></header>${[
        // un tableau peut être lu ailleurs dans la version rapide qu'à sa place dans le musée
        ...r.paintings.filter((id) => !(content.fastPlacement || {})[id]),
        ...Object.entries(content.fastPlacement || {}).filter(([, room]) => room === r.id).map(([id]) => id),
      ]
        .sort((a, b) => (a === 'contact') - (b === 'contact'))
        .filter((id) => id !== featured)
        .map((id, i) => renderPainting(content, id, lang, { number: `${r.number}.${i + 1}` }))
        .join('')}</section>`,
    )
    .join('');
  return `<header class="hero"><p class="hero__short">${t(content.identity.short)}</p><h1>${escapeHtml(content.identity.name)}</h1><p class="hero__tagline">${t(content.identity.tagline)}</p>${offers}${content.seeking ? `<p class="seeking">${t(content.seeking)}</p>` : ''}${contactLinks(content, lang)}<nav aria-label="Index"><ol class="index">${indexLead}${index}</ol></nav></header>${lead}${rooms}`;
}
