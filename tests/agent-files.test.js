import { test, expect } from 'bun:test';
import content from '../content/site.json';
import { buildCvText, buildCvJson, buildLlmsTxt, buildJsonLd } from '../scripts/agent-files.js';
const all = [buildCvText(content, 'fr'), buildCvText(content, 'en'),
  JSON.stringify(buildCvJson(content)), buildLlmsTxt(content), JSON.stringify(buildJsonLd(content))];

test('aucun e-mail dans les fichiers pour les IA', () => {
  for (const t of all) { expect(t).not.toContain('@gmail'); expect(t).not.toContain('clementgast4'); }
});
test('LinkedIn et GitHub sont les contacts', () => {
  const cv = buildCvText(content, 'fr');
  expect(cv).toContain(content.links.linkedin); expect(cv).toContain(content.links.github);
});
test('le CV texte dit la même chose que le site', () => {
  const cv = buildCvText(content, 'fr').replace(/\s+/g, ' ');
  expect(cv).toContain(content.identity.tagline.fr);
  for (const e of content.education) expect(cv).toContain(e.title.fr);
  for (const p of content.passions) expect(cv).toContain(p.fr);
  for (const s of content.skills) expect(cv).toContain(s.label.fr);
});
test('le CV texte tient en 80 colonnes, sauf les adresses', () => {
  for (const line of buildCvText(content, 'fr').split('\n')) {
    if (!line.includes('http')) expect(line.length).toBeLessThanOrEqual(80);
  }
});
test('llms.txt pointe vers les CV', () => {
  const l = buildLlmsTxt(content);
  for (const f of ['cv.fr.txt', 'cv.en.txt', 'cv.json']) expect(l).toContain(f);
});
test('JSON-LD décrit une personne', () => {
  const j = buildJsonLd(content);
  expect(j['@type']).toBe('Person'); expect(j.name).toBe('Clément GAST'); expect(j.email).toBeUndefined();
  expect(j.sameAs).toEqual([content.links.linkedin, content.links.github]);
});
