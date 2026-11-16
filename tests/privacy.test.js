import { test, expect } from 'bun:test';
import { scanText } from '../scripts/privacy-check.js';
const G = { forbidden: [], allow: ['IAE Nice', "IUT Nice Côte d'Azur"], generic: true };

test('détecte les formats de téléphone', () => {
  for (const t of ['01 23 45 67 89', '0123456789', '+33 1 23 45 67 89', '01.23.45.67.89'])
    expect(scanText(`tel ${t}`, G).map(f => f.rule)).toContain('phone');
});
test('détecte un code postal et un e-mail', () => {
  expect(scanText('à 75001 Paris', G).map(f => f.rule)).toContain('postal');
  expect(scanText('a@b.fr', G).map(f => f.rule)).toContain('email');
});
test('les années et les noms officiels des écoles passent', () => {
  expect(scanText("Master à l'IAE Nice, 2026 – 2028. IUT Nice Côte d'Azur. TOEIC 865 / 990.", G)).toEqual([]);
});
test('cinq chiffres collés à des lettres ne sont pas un code postal (adresse LinkedIn)', () => {
  expect(scanText('https://www.linkedin.com/in/cl%C3%A9ment-gast-b7b07129a', G)).toEqual([]);
});
test('les marqueurs JSON-LD ne sont pas des e-mails', () => {
  expect(scanText('{"@context":"https://schema.org","@type":"Person"}', G)).toEqual([]);
});
test('valeur interdite trouvée sans tenir compte de la casse ni des accents', () => {
  const r = { forbidden: ['Pâquerette'], allow: [], generic: false };
  expect(scanText('campus des PAQUERETTE', r)).toHaveLength(1);
});
test("une valeur interdite reste interdite même à côté d'un nom autorisé", () => {
  const r = { forbidden: ['Nice'], allow: ['IAE Nice'], generic: false };
  expect(scanText('IAE Nice', r)).toEqual([]);
  expect(scanText("j'habite à Nice", r)).toHaveLength(1);
});
test('une valeur interdite ne se déclenche pas au milieu d\'un mot', () => {
  const r = { forbidden: ['Nice'], allow: [], generic: false };
  expect(scanText('function minicerTruc() {}', r)).toEqual([]);
});
test('sans règles génériques, un téléphone inconnu passe', () => {
  expect(scanText('01 23 45 67 89', { forbidden: [], allow: [], generic: false })).toEqual([]);
});

import { printableRuns } from '../scripts/privacy-check.js';
test('dans une image, seuls les vrais textes (métadonnées) sont contrôlés, pas le bruit binaire', () => {
  const noise = [0xff, 0xd8, 0x51, 0x77, 0x7a, 0x00, 0x91]; // « Qwz » par hasard, entre deux octets binaires
  const meta = [...Buffer.from('Auteur: Jean Dupont 0612345678')];
  const text = printableRuns(Uint8Array.from([...noise, ...meta, 0x00, 0xfe]));
  expect(text).not.toContain('Qwz'); expect(text).toContain('Jean Dupont 0612345678');
});

import { scanBinary } from '../scripts/privacy-check.js';
const F = { forbidden: ['campus des Lilas', 'Pâquerette'], allow: ['IUT Lilas Nord'], generic: false };
test('une valeur interdite coupée à la ligne ou séparée par une espace insécable est trouvée', () => {
  expect(scanText('inscrit au campus des\n  Lilas depuis', F)).toHaveLength(1);
  expect(scanText('campus des Lilas', F)).toHaveLength(1);
});
test('une valeur interdite encodée pour une adresse ou en entités HTML est trouvée', () => {
  expect(scanText('https://x.test/campus%20des%20Lilas', F)).toHaveLength(1);
  expect(scanText('/profil/P%C3%A2querette', F)).toHaveLength(1);
  expect(scanText('P&acirc;querette et P&#226;querette et P&#xE2;querette', F)).toHaveLength(3);
});
test('un nom autorisé masque aussi sa forme déguisée, pas la valeur seule', () => {
  const r = { forbidden: ['Lilas'], allow: ['IUT Lilas Nord'], generic: false };
  expect(scanText('IUT Lilas\nNord', r)).toHaveLength(0); expect(scanText("j'habite aux Lilas", r)).toHaveLength(1);
});
test('les métadonnées écrites en UTF-16 (champ Auteur de Windows) sont lues', () => {
  const meta = Buffer.from('Auteur Pâquerette Dupont', 'utf16le');
  const bytes = Uint8Array.from([0xff, 0xd8, 0x00, ...meta, 0x00, 0x00, 0xff]);
  expect(scanBinary(bytes, F).length).toBeGreaterThanOrEqual(1);
});
test('le texte compressé d\'une image PNG (zTXt) est lu', () => {
  const { deflateSync } = require('node:zlib');
  const data = Buffer.concat([Buffer.from('Author\0\0'), deflateSync(Buffer.from('campus des Lilas'))]);
  const chunk = Buffer.concat([Buffer.alloc(4), Buffer.from('zTXt'), data, Buffer.alloc(4)]);
  chunk.writeUInt32BE(data.length, 0);
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...chunk]);
  expect(scanBinary(png, F).length).toBeGreaterThanOrEqual(1);
});

test('une valeur courte dans les métadonnées d\'une image JPEG (Exif, XMP) est trouvée, sans seuil de longueur', () => {
  const field = Buffer.from('Lilas\0');
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, 0, field.length + 2]), field]);
  const jpg = Uint8Array.from([0xff, 0xd8, ...app1, 0xff, 0xda, 0x00, 0x02, 0x11, 0x22]);
  expect(scanBinary(jpg, { forbidden: ['Lilas'], allow: [], generic: false })).toHaveLength(1);
});
test('le contrôle d\'une branche refuse de valider sans la liste privée', () => {
  const run = Bun.spawnSync(['bun', 'scripts/privacy-check.js', '--git', 'main', '--local', 'inexistant.json']);
  expect(run.exitCode).not.toBe(0);
}, 120000);
