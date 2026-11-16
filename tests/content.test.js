import { test, expect } from 'bun:test';
import content from '../content/site.json';
import { localize, validateContent } from '../src/content.js';

test('le contenu réel est valide', () => { expect(validateContent(content)).toEqual([]); });
test('localize retombe sur le français', () => {
  expect(localize({ fr: 'Bonjour' }, 'en')).toBe('Bonjour');
  expect(localize({ fr: 'Bonjour', en: 'Hello' }, 'en')).toBe('Hello');
});
test('une traduction manquante est signalée', () => {
  const bad = structuredClone(content); delete bad.identity.tagline.en;
  expect(validateContent(bad)).toContain('identity.tagline: en manquant');
});
test('un tableau inconnu dans une salle est signalé', () => {
  const bad = structuredClone(content); bad.rooms[0].paintings.push('fantome');
  expect(validateContent(bad)).toContain('rooms.ia: tableau inconnu "fantome"');
});
test('une compétence sans preuve est signalée', () => {
  const bad = structuredClone(content); bad.skills[0].proofPainting = 'fantome';
  expect(validateContent(bad).some(e => e.startsWith('skills[0]'))).toBe(true);
});
test('quatre salles, huit tableaux, trois passions', () => {
  expect(content.rooms.map(r => r.id)).toEqual(['ia', 'trading', 'stack', 'apropos']);
  expect(content.rooms.flatMap(r => r.paintings)).toHaveLength(8);
  expect(content.paintings[content.secret.painting]).toBeDefined();
  expect(content.passions).toHaveLength(3);
});
test('les lieux sans tableau ont un numéro et un titre dans les deux langues', () => {
  for (const key of ['hall', 'garden', 'secret']) { expect(content[key].number).toBeTruthy(); expect(content[key].title.fr).toBeTruthy(); expect(content[key].title.en).toBeTruthy(); }
});
test('une faute dans le placement ou la réalisation phare est refusée, au lieu de faire disparaître un tableau', () => {
  const bad = structuredClone(content); bad.fastPlacement = { echiquier: 'apropo' }; bad.featured = 'tethis';
  const errors = validateContent(bad);
  expect(errors.some(e => e.startsWith('fastPlacement'))).toBe(true); expect(errors.some(e => e.startsWith('featured'))).toBe(true);
  const unknown = structuredClone(content); unknown.fastPlacement = { fantome: 'apropos' };
  expect(validateContent(unknown).some(e => e.startsWith('fastPlacement'))).toBe(true);
});
test('les apostrophes des textes sont typographiques, pas droites', () => {
  const texts = JSON.stringify(content).replace(/"link":"[^"]*"/g, '');
  expect(texts.match(/\p{L}'\p{L}/gu)).toBeNull();
});
