import { test, expect } from 'bun:test';
import content from '../content/site.json';
import { renderFast, renderPainting } from '../src/fast/render.js';
const fr = renderFast(content, 'fr'), en = renderFast(content, 'en');

test('nom et accroche présents dans les deux langues', () => {
  expect(fr).toContain('Clément GAST');
  expect(fr).toContain(content.identity.tagline.fr);
  expect(en).toContain('Master’s student in International Business');
});
test('quatre salles numérotées et huit tableaux', () => {
  for (const r of content.rooms) expect(fr).toContain(`id="room-${r.id}"`);
  expect(fr.match(/<article id="painting-/g)).toHaveLength(8);
  expect(fr).toContain('01'); expect(fr).toContain('04');
});
test("l'e-mail n'est jamais écrit en clair", () => {
  // l'adresse est recomposée depuis le contenu : elle n'est écrite nulle part en clair, même ici
  const { user, domain } = content.links.email;
  expect(fr).not.toContain(`${user}@${domain}`);
  expect(fr).not.toContain('mailto:');
  expect(fr).toContain('data-email-button');
});
test('les expériences renvoient à LinkedIn', () => { expect(fr).toContain(content.links.linkedin); });
test('aucun pourcentage affiché dans le texte visible', () => {
  expect(fr.replace(/<[^>]*>/g, ' ')).not.toMatch(/\d+\s?%/);
});
test('le texte du contenu est échappé', () => {
  const c = structuredClone(content); c.identity.name = '<script>x</script>';
  expect(renderFast(c, 'fr')).not.toContain('<script>x</script>');
});
test('les liens externes sont protégés', () => {
  const links = fr.match(/<a [^>]*href="https?:[^>]*>/g);
  expect(links.length).toBeGreaterThan(0);
  for (const a of links) { expect(a).toContain('rel="noopener noreferrer"'); expect(a).toContain('target="_blank"'); }
});
test('renderPainting rend un seul tableau, identique à celui de la page', () => {
  const one = renderPainting(content, 'tethys', 'fr', { number: '★' });
  expect(one.match(/<article /g)).toHaveLength(1);
  expect(fr).toContain(one);
  // dans le musée, le panneau garde la place du tableau dans sa salle
  expect(renderPainting(content, 'tethys', 'fr')).toContain('>03.2<');
});

test('chaque tableau annonce l\'œuvre qu\'il détourne et en garde les proportions', () => {
  const html = renderPainting(content, 'bot-trading', 'fr');
  expect(html).toContain('data-work="great-wave"'); expect(html).toContain('width="640" height="430"');
  expect(html).toContain('D’après « La Grande Vague de Kanagawa », Katsushika Hokusai, vers 1831');
  expect(renderPainting(content, 'bot-trading', 'en')).toContain('After “The Great Wave off Kanagawa”, Katsushika Hokusai, c. 1831');
  expect(renderPainting(content, 'contact', 'en')).toContain('Michelangelo, c. 1511'); expect(renderPainting(content, 'stack', 'en')).toContain('Pieter Bruegel the Elder, 1563');
  expect(renderPainting(content, 'a-propos', 'fr')).toContain('width="500" height="640"');
  expect(renderPainting(content, 'secret', 'fr')).not.toContain('data-work');
});

test('la réalisation phare ouvre la version rapide, une seule fois', () => {
  expect(content.featured).toBe('tethys');
  expect(fr.indexOf('id="painting-tethys"')).toBeGreaterThan(-1);
  expect(fr.indexOf('id="painting-tethys"')).toBeLessThan(fr.indexOf('id="painting-ia-locale"'));
  expect(fr.split('id="painting-tethys"')).toHaveLength(2);
  expect(fr).toContain(content.ui.featured.fr); expect(en).toContain(content.ui.featured.en);
});
test('ce que je propose est dit dès le haut de la page, dans les deux langues', () => {
  expect(content.offers.length).toBeGreaterThanOrEqual(2);
  const hero = fr.slice(0, fr.indexOf('</header>'));
  for (const offer of content.offers) { expect(hero).toContain(offer.fr.replace("'", '&#39;')); expect(en).toContain(offer.en); }
});
test('aucun compteur qui ne compte que la page elle-même', () => {
  expect(content.counters).toEqual([]); expect(fr).not.toContain('class="counters"');
});
test('aucune compétence ne se prouve par le carnet de notes personnel quand un projet livré existe', () => {
  const pm = content.skills.find(s => s.label.fr === 'Gestion de projet'); expect(pm.proofPainting).toBe('tethys');
});

import { readdirSync, readFileSync } from 'node:fs';
const nums = (html) => [...html.matchAll(/class="painting__num">([^<]*)</g)].map(m => m[1]);
test('les numéros de la version rapide se suivent dans l\'ordre de lecture', () => {
  for (const html of [fr, en]) {
    const list = nums(html); expect(list[0]).toBe('★');
    const rest = list.slice(1).map(n => n.split('.').map(Number));
    for (let i = 1; i < rest.length; i++) {
      const [a, b] = [rest[i - 1], rest[i]];
      expect(b[0] > a[0] || (b[0] === a[0] && b[1] === a[1] + 1)).toBe(true);
    }
    for (const n of rest) if (n[1] === undefined || n[1] < 1) throw new Error('numéro mal formé');
  }
  expect(fr).toContain('href="#featured"');
});
test('je dis ce que je cherche, en haut de page et au contact', () => {
  const hero = fr.slice(0, fr.indexOf('</header>'));
  expect(hero).toContain(content.seeking.fr.replaceAll("'", '&#39;')); expect(en).toContain(content.seeking.en.replaceAll("'", '&#39;'));
  expect(content.paintings.contact.body[0].fr).toContain('stage');
});
test('chaque chiffre affiché est réel : le nombre de tests annoncé ne dépasse jamais le vrai', () => {
  const ids = Object.entries(content.paintings).filter(([, p]) => p.figure).map(([id]) => id).sort();
  expect(ids).toEqual(['coffre-agents', 'ia-locale', 'stack', 'tethys']);
  for (const id of ids) { const f = content.paintings[id].figure; for (const k of ['value', 'label']) { expect(f[k].fr).toBeTruthy(); expect(f[k].en).toBeTruthy(); } }
  expect(renderPainting(content, 'tethys', 'fr')).toContain('class="figure"');
  const real = readdirSync('tests').filter(f => f.endsWith('.test.js')).reduce((n, f) => n + (readFileSync(`tests/${f}`, 'utf8').match(/^test\(/gm) || []).length, 0);
  expect(real).toBeGreaterThanOrEqual(parseInt(content.paintings.stack.figure.value.fr, 10));
});
test('aucun prénom de tiers n\'est publié', () => { expect(JSON.stringify(content)).not.toContain('Giacomo'); });

test('dans la version rapide, l\'échiquier rejoint les passions et la méthode suit le bot', () => {
  const at = (id) => fr.indexOf(`id="painting-${id}"`);
  const trading = fr.slice(fr.indexOf('id="room-trading"'), fr.indexOf('id="room-stack"'));
  expect(trading).not.toContain('painting-echiquier');
  expect(at('a-propos')).toBeLessThan(at('echiquier')); expect(at('echiquier')).toBeLessThan(at('contact'));
  expect(fr.split('id="painting-echiquier"')).toHaveLength(2);
});
test('aucune barre de niveau sans donnée, aucune promesse de chiffre non affiché', () => {
  expect(fr).not.toContain('skill__bar');
  expect(JSON.stringify(content.paintings['bot-trading'].body)).not.toContain('chiffres honnêtes');
});

import { renderLoader } from '../src/fast/render.js';
test('l\'écran de chargement explique le musée et le choix de l\'art, dans les deux langues', () => {
  for (const lang of ['fr', 'en']) {
    const html = renderLoader(content, lang);
    for (const key of ['title', 'line', 'why']) expect(html).toContain(content.loader[key][lang].replaceAll("'", '&#39;'));
    expect(html).toContain('class="loader__bar"');
  }
});
test('l\'écran de chargement est stylé avant tout le reste, sans style en ligne, et ne bloque jamais sans JavaScript', () => {
  const page = readFileSync('index.html', 'utf8');
  expect(page.indexOf('href="/loader.css"')).toBeLessThan(page.indexOf('<!--JSONLD-->'));
  expect(page).toContain('<noscript><link rel="stylesheet" href="/noscript.css" /></noscript>');
  expect(page).toContain('<div id="loader"'); expect(page).toContain('<!--LOADER-->');
  expect(readFileSync('public/loader.css', 'utf8')).toContain('loader-failsafe');
  expect(readFileSync('public/noscript.css', 'utf8')).toContain('#loader');
});
test('la description pour les moteurs de recherche reprend l\'accroche actuelle', () => {
  expect(readFileSync('index.html', 'utf8')).toContain('<!--DESCRIPTION-->');
});
