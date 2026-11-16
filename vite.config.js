import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { validateContent } from './src/content.js';
import { escapeHtml, renderFast, renderLoader } from './src/fast/render.js';
import { buildJsonLd } from './scripts/agent-files.js';
import { productionCsp } from './scripts/csp.js';

function loadContent() {
  const content = JSON.parse(readFileSync(new URL('./content/site.json', import.meta.url), 'utf8'));
  const errors = validateContent(content);
  if (errors.length) {
    throw new Error(`Contenu invalide :\n- ${errors.join('\n- ')}`);
  }
  return content;
}

// Écrit la version rapide en français directement dans index.html :
// le contenu est lisible même sans JavaScript et sans 3D.
function prerenderFast() {
  return {
    name: 'prerender-fast',
    transformIndexHtml(html) {
      const content = loadContent();
      // « < » est neutralisé pour qu'aucun texte du contenu ne puisse fermer la balise.
      const jsonLd = JSON.stringify(buildJsonLd(content)).replace(/</g, '\\u003c');
      return html
        .replace('<!--JSONLD-->', `<script type="application/ld+json">${jsonLd}</script>`)
        .replace('<!--FAST-->', renderFast(content, 'fr'))
        .replace('<!--LOADER-->', renderLoader(content, 'fr'))
        .replace('<!--DESCRIPTION-->', `<meta name="description" content="${escapeHtml(content.identity.tagline.fr)}" />`);
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [prerenderFast(), { name: 'csp-production', apply: 'build', transformIndexHtml: productionCsp }],
  build: { target: 'es2022' },
});
