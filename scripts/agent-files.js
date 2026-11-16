// Fichiers destinés aux IA et aux scripts : CV en texte brut, données structurées,
// fichier d'accueil. Ils sortent du même contenu que le site.
// L'e-mail n'y figure jamais : ces fichiers sont lus par des robots.
import { localize } from '../src/content.js';

export const SITE_URL = 'https://clement4-g.github.io';

const LABELS = {
  fr: { projects: 'PROJETS', skills: 'COMPÉTENCES ET PREUVES', education: 'FORMATIONS', passions: 'PASSIONS', contact: 'CONTACT', experience: 'Expériences professionnelles : voir LinkedIn.', tools: 'Outils', site: 'Site' },
  en: { projects: 'PROJECTS', skills: 'SKILLS AND PROOF', education: 'EDUCATION', passions: 'PASSIONS', contact: 'CONTACT', experience: 'Work experience: see LinkedIn.', tools: 'Tools', site: 'Website' },
};

function wrap(text, width = 80, indent = '') {
  const lines = [];
  let line = indent;
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    if (line.length > indent.length && line.length + 1 + word.length > width) {
      lines.push(line);
      line = indent + word;
    } else {
      line = line.length > indent.length ? `${line} ${word}` : indent + word;
    }
  }
  if (line.trim()) lines.push(line);
  return lines.join('\n');
}

function projectIds(content) {
  // Les tableaux qui servent de preuve à une compétence sont les projets.
  return [...new Set(content.skills.map((s) => s.proofPainting))];
}

export function buildCvText(content, lang) {
  const L = LABELS[lang] || LABELS.fr;
  const t = (node) => localize(node, lang);
  const out = [];
  out.push(content.identity.name.toUpperCase());
  out.push(wrap(t(content.identity.short)));
  out.push('');
  out.push(wrap(t(content.identity.tagline)));
  if (content.seeking) out.push(wrap(t(content.seeking)));
  out.push('');
  out.push(L.projects);
  for (const id of projectIds(content)) {
    const p = content.paintings[id];
    out.push(wrap(`- ${t(p.title)}`));
    for (const para of p.body) out.push(wrap(t(para), 80, '  '));
    if (p.tools.length) out.push(wrap(`${L.tools} : ${p.tools.join(', ')}`, 80, '  '));
    if (p.link) out.push(`  ${L.site} : ${p.link}`);
  }
  out.push('');
  out.push(L.skills);
  for (const s of content.skills) out.push(wrap(`- ${t(s.label)} : ${t(s.did)}`, 80).replace(/\n/g, '\n  '));
  out.push('');
  out.push(L.education);
  for (const e of content.education) {
    const meta = [e.school, e.years].filter(Boolean).join(', ');
    out.push(wrap(`- ${t(e.title)}${meta ? ` (${meta})` : ''}`).replace(/\n/g, '\n  '));
  }
  out.push('');
  out.push(L.passions);
  out.push(wrap(content.passions.map(t).join(', ')));
  out.push('');
  out.push(L.contact);
  out.push(L.experience);
  out.push(`LinkedIn : ${content.links.linkedin}`);
  out.push(`GitHub : ${content.links.github}`);
  out.push(`${L.site} : ${SITE_URL}/`);
  return `${out.join('\n')}\n`;
}

export function buildCvJson(content) {
  const both = (node) => ({ fr: localize(node, 'fr'), en: localize(node, 'en') });
  return {
    name: content.identity.name,
    headline: both(content.identity.short),
    summary: both(content.identity.tagline),
    ...(content.seeking ? { seeking: both(content.seeking) } : {}),
    projects: projectIds(content).map((id) => {
      const p = content.paintings[id];
      return { id, title: both(p.title), description: p.body.map(both), tools: p.tools, url: p.link };
    }),
    skills: content.skills.map((s) => ({ label: both(s.label), evidence: both(s.did), project: s.proofPainting })),
    education: content.education.map((e) => ({ title: both(e.title), school: e.school || null, years: e.years || null })),
    interests: content.passions.map(both),
    contact: { linkedin: content.links.linkedin, github: content.links.github, website: `${SITE_URL}/` },
  };
}

export function buildLlmsTxt(content) {
  return [
    `# ${content.identity.name}`,
    '',
    `> ${localize(content.identity.tagline, 'en')}`,
    '',
    'This is the portfolio of Clément GAST. The visual site is a 3D museum;',
    'the files below contain the same information as plain text and data.',
    '',
    '## Files',
    '',
    `- [CV (français, texte brut)](${SITE_URL}/cv.fr.txt)`,
    `- [CV (English, plain text)](${SITE_URL}/cv.en.txt)`,
    `- [CV (JSON, bilingual)](${SITE_URL}/cv.json)`,
    '',
    '## Contact',
    '',
    `- LinkedIn: ${content.links.linkedin}`,
    `- GitHub: ${content.links.github}`,
    '',
  ].join('\n');
}

export function buildJsonLd(content) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: content.identity.name,
    description: localize(content.identity.tagline, 'fr'),
    url: `${SITE_URL}/`,
    sameAs: [content.links.linkedin, content.links.github],
    knowsAbout: content.skills.map((s) => localize(s.label, 'fr')),
  };
}
