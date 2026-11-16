// Écrit les fichiers pour les IA dans dist/, après le build du site.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildCvJson, buildCvText, buildLlmsTxt } from './agent-files.js';

const content = JSON.parse(readFileSync(new URL('../content/site.json', import.meta.url), 'utf8'));
const dist = new URL('../dist/', import.meta.url);
mkdirSync(dist, { recursive: true });

const files = {
  'cv.fr.txt': buildCvText(content, 'fr'),
  'cv.en.txt': buildCvText(content, 'en'),
  'cv.json': `${JSON.stringify(buildCvJson(content), null, 2)}\n`,
  'llms.txt': buildLlmsTxt(content),
};

for (const [name, text] of Object.entries(files)) {
  writeFileSync(new URL(name, dist), text, 'utf8');
}
console.log(`Fichiers pour les IA écrits : ${Object.keys(files).join(', ')}`);
