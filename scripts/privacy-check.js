// Contrôle de vie privée avant mise en ligne.
//
//   bun scripts/privacy-check.js <dossier> [--local privacy.local.json]
//   git log -p | bun scripts/privacy-check.js --stdin [--local privacy.local.json]
//   bun scripts/privacy-check.js --git main [--local privacy.local.json]   (fichiers et historique d'une branche)
//
// Deux niveaux :
// - règles génériques (téléphone, code postal, e-mail) sur les fichiers de texte ;
// - valeurs interdites réelles, lues dans un fichier local jamais envoyé sur GitHub,
//   cherchées dans tous les fichiers.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { extname, join } from 'node:path';

export const DEFAULT_ALLOW = ['IAE Nice', "IUT Nice Côte d'Azur"];

const GENERIC_EXTENSIONS = new Set(['.html', '.txt', '.json', '.md']);
// le code livré est aussi contrôlé, sans la règle du code postal (trop de nombres à cinq chiffres dans le code)
const CODE_EXTENSIONS = new Set(['.js', '.css', '.mjs']);

const GENERIC_RULES = [
  { rule: 'phone', regex: /(?<![\w.])(?:\+33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}(?!\d)/g },
  { rule: 'postal', regex: /(?<![\w%-])\d{5}(?![\w-])/g },
  { rule: 'email', regex: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
];

// Minuscules et sans accents, en gardant la même longueur que le texte d'origine.
function normalize(text) {
  let out = '';
  for (const char of text) {
    const base = char.normalize('NFD').replace(/[̀-ͯ]/g, '');
    out += base.length === 1 ? base.toLowerCase() : char.toLowerCase();
  }
  return out;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', agrave: 'à', acirc: 'â', auml: 'ä', ccedil: 'ç', icirc: 'î', iuml: 'ï', ocirc: 'ô', ouml: 'ö', ugrave: 'ù', ucirc: 'û', uuml: 'ü', rsquo: '’', lsquo: '‘' };

// Défait les déguisements courants d'un texte : encodage d'adresse (%C3%A9), entités HTML (&eacute;, &#233;),
// retours à la ligne, espaces insécables et suites d'espaces au milieu d'une valeur.
export function undisguise(text) {
  let out = text.replace(/(?:%[0-9a-f]{2})+/gi, (seq) => {
    try {
      return decodeURIComponent(seq);
    } catch {
      return seq;
    }
  });
  out = out.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
  return out.replace(/[\s\u00a0\u202f\u2007\u2009]+/g, ' ');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Remplace les passages autorisés par des espaces pour qu'ils ne déclenchent rien.
function maskAllowed(text, allow) {
  let masked = text;
  const normalized = normalize(text);
  for (const phrase of allow) {
    const needle = normalize(phrase);
    if (!needle) continue;
    let from = 0;
    for (;;) {
      const at = normalized.indexOf(needle, from);
      if (at === -1) break;
      masked = masked.slice(0, at) + ' '.repeat(needle.length) + masked.slice(at + needle.length);
      from = at + needle.length;
    }
  }
  return masked;
}

export function scanText(text, rules) {
  const findings = [];
  const masked = maskAllowed(text, rules.allow || []);
  const genericRules = rules.generic === 'code' ? GENERIC_RULES.filter((r) => r.rule !== 'postal') : GENERIC_RULES;

  if (rules.generic) {
    for (const { rule, regex } of genericRules) {
      for (const match of masked.matchAll(regex)) {
        findings.push({ rule, match: match[0], index: match.index });
      }
    }
  }

  // les valeurs interdites sont cherchées dans la forme « dédéguisée » du texte (adresses décodées,
  // entités HTML résolues, espaces et retours à la ligne ramenés à une espace) ; un nom autorisé
  // (une école) masque seulement ce qu'il contient, jamais la même valeur ailleurs
  const form = maskAllowed(undisguise(text), rules.allow || []);
  const normalized = normalize(form);
  for (const value of rules.forbidden || []) {
    const needle = normalize(undisguise(value)).trim();
    if (!needle) continue;
    const regex = new RegExp(`(?<![a-z0-9])${escapeRegex(needle)}(?![a-z0-9])`, 'g');
    for (const match of normalized.matchAll(regex)) {
      findings.push({ rule: 'forbidden', match: form.slice(match.index, match.index + needle.length), index: match.index });
    }
  }
  return findings.sort((a, b) => a.index - b.index);
}

const BINARY_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.woff', '.woff2']);

// Dans un fichier binaire, on ne garde que les suites d'au moins huit caractères lisibles :
// c'est là que vivent les métadonnées (auteur, lieu), pas dans le bruit de la compression.
export function printableRuns(bytes, min = 8) {
  const runs = [];
  let current = '';
  for (const byte of bytes) {
    if (byte >= 32 && byte < 127) current += String.fromCharCode(byte);
    else {
      if (current.length >= min) runs.push(current);
      current = '';
    }
  }
  if (current.length >= min) runs.push(current);
  return runs.join('\n');
}

// Les mêmes suites lisibles, en UTF-16 (petit et grand boutiste) : c'est ainsi que Windows écrit
// le champ « Auteur » des images.
function utf16Runs(bytes, min = 8) {
  const runs = [];
  for (const offset of [0, 1]) {
    let current = '';
    for (let i = 0; i + 1 < bytes.length; i += 2) {
      const lo = offset === 0 ? bytes[i] : bytes[i + 1];
      const hi = offset === 0 ? bytes[i + 1] : bytes[i];
      const code = lo | (hi << 8);
      if (code >= 32 && code !== 0xfffe && code !== 0xffff && code < 0xd800) current += String.fromCharCode(code);
      else {
        if (current.length >= min) runs.push(current);
        current = '';
      }
    }
    if (current.length >= min) runs.push(current);
  }
  return runs.join('\n');
}

// Textes compressés des images PNG (blocs zTXt et iTXt).
function pngTexts(bytes) {
  const buf = Buffer.from(bytes);
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) return '';
  const texts = [];
  let at = 8;
  while (at + 8 <= buf.length) {
    const length = buf.readUInt32BE(at);
    const type = buf.toString('latin1', at + 4, at + 8);
    const data = buf.subarray(at + 8, at + 8 + length);
    try {
      if (type === 'zTXt') {
        const sep = data.indexOf(0);
        texts.push(data.toString('latin1', 0, sep), inflateSync(data.subarray(sep + 2)).toString('latin1'));
      } else if (type === 'iTXt') {
        const sep = data.indexOf(0);
        const compressed = data[sep + 1] === 1;
        let rest = sep + 3;
        rest = data.indexOf(0, rest) + 1; // étiquette de langue
        rest = data.indexOf(0, rest) + 1; // mot-clé traduit
        const body = data.subarray(rest);
        texts.push(data.toString('latin1', 0, sep), (compressed ? inflateSync(body) : body).toString('utf8'));
      }
    } catch {
      // bloc illisible : on passe au suivant
    }
    at += 12 + length;
  }
  return texts.join('\n');
}

// Segments de métadonnées d'un JPEG (Exif, XMP, IPTC, commentaires), lus en entier et sans seuil
// de longueur, dans les trois encodages possibles : une commune courte n'y passe plus inaperçue.
function jpegMeta(bytes) {
  const buf = Buffer.from(bytes);
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return '';
  const texts = [];
  let at = 2;
  while (at + 4 <= buf.length && buf[at] === 0xff) {
    const marker = buf[at + 1];
    if (marker === 0xda || marker === 0xd9) break; // début de l'image compressée : plus de métadonnées
    const length = buf.readUInt16BE(at + 2);
    if (length < 2) break;
    if ((marker >= 0xe0 && marker <= 0xef) || marker === 0xfe) {
      const seg = buf.subarray(at + 4, at + 2 + length);
      texts.push(seg.toString('latin1'), seg.toString('utf8'), seg.toString('utf16le'), Buffer.from(seg).swap16 && seg.length % 2 === 0 ? Buffer.from(seg).swap16().toString('utf16le') : '');
    }
    at += 2 + length;
  }
  return texts.join('\n').replace(/\0/g, ' ');
}

// Contrôle d'un fichier binaire : métadonnées lisibles en ASCII, en UTF-16, et textes PNG compressés.
export function scanBinary(bytes, rules) {
  // la même valeur lue dans plusieurs encodages ne compte qu'une fois
  const seen = new Set();
  return scanText([jpegMeta(bytes), printableRuns(bytes), utf16Runs(bytes), pngTexts(bytes)].join('\n'), rules).filter((f) => {
    const key = `${f.rule}:${f.match.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scanFile(name, bytes, forbidden) {
  const ext = extname(name).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) return { text: '', findings: scanBinary(bytes, { forbidden, allow: DEFAULT_ALLOW, generic: false }) };
  const text = Buffer.from(bytes).toString('utf8');
  const generic = GENERIC_EXTENSIONS.has(ext) ? true : CODE_EXTENSIONS.has(ext) ? 'code' : false;
  return { text, findings: scanText(text, { forbidden, allow: DEFAULT_ALLOW, generic }) };
}

function listFiles(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files.push(...listFiles(path));
    else files.push(path);
  }
  return files;
}

function excerpt(text, index) {
  return text.slice(Math.max(0, index - 30), index + 40).replace(/\s+/g, ' ');
}

function loadForbidden(localPath) {
  if (!localPath) return [];
  if (!existsSync(localPath)) {
    console.warn(`Avertissement : ${localPath} introuvable, seules les règles génériques sont appliquées.`);
    return [];
  }
  const data = JSON.parse(readFileSync(localPath, 'utf8'));
  return Array.isArray(data.forbidden) ? data.forbidden : [];
}

async function main(argv) {
  const args = [...argv];
  const localAt = args.indexOf('--local');
  const localPath = localAt === -1 ? null : args.splice(localAt, 2)[1];
  const stdinAt = args.indexOf('--stdin');
  const useStdin = stdinAt !== -1;
  if (useStdin) args.splice(stdinAt, 1);
  const forbidden = loadForbidden(localPath);
  const problems = [];

  const gitAt = args.indexOf('--git');
  if (gitAt !== -1) {
    // la branche qui sera publiée : chacun de ses fichiers, puis tout son historique
    const ref = args[gitAt + 1];
    // contrôler une branche à publier sans la liste privée, c'est ne rien contrôler : on refuse
    if (!localPath || !existsSync(localPath)) {
      console.error(`Contrôle impossible : liste privée introuvable (${localPath || 'aucune'}). Envoi refusé.`);
      return 2;
    }
    if (!ref || !/^[\w./-]+$/.test(ref)) {
      console.error('Usage : bun scripts/privacy-check.js --git <branche> [--local privacy.local.json]');
      return 2;
    }
    const names = execFileSync('git', ['ls-tree', '-r', '--name-only', ref], { encoding: 'utf8' }).split('\n').filter(Boolean);
    for (const name of names) {
      const bytes = execFileSync('git', ['show', `${ref}:${name}`], { maxBuffer: 64 * 1024 * 1024 });
      for (const f of scanFile(name, bytes, forbidden).findings.filter((x) => x.rule === 'forbidden')) problems.push(`${ref}:${name} [forbidden] « ${f.match} »`);
    }
    const history = execFileSync('git', ['log', '-p', ref], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    for (const f of scanText(history, { forbidden, allow: [], generic: false })) problems.push(`historique de ${ref} [forbidden] « ${f.match} »`);
  } else if (useStdin) {
    const text = await Bun.stdin.text();
    for (const f of scanText(text, { forbidden, allow: DEFAULT_ALLOW, generic: true })) {
      problems.push(`(entrée) [${f.rule}] « ${f.match} » … ${excerpt(text, f.index)}`);
    }
  } else {
    const dir = args[0];
    if (!dir || !existsSync(dir)) {
      console.error('Usage : bun scripts/privacy-check.js <dossier> [--local privacy.local.json]');
      return 2;
    }
    for (const file of listFiles(dir)) {
      const { text, findings } = scanFile(file, readFileSync(file), forbidden);
      for (const f of findings) {
        problems.push(`${file} [${f.rule}] « ${f.match} »${text ? ` … ${excerpt(text, f.index)}` : ''}`);
      }
    }
  }

  if (problems.length) {
    console.error(`Contrôle de vie privée : ${problems.length} problème(s)`);
    for (const p of problems) console.error(`  - ${p}`);
    return 1;
  }
  console.log(`Contrôle de vie privée : rien à signaler${forbidden.length ? ` (${forbidden.length} valeurs locales vérifiées)` : ' (règles génériques seulement)'}.`);
  return 0;
}

if (import.meta.main) {
  process.exit(await main(process.argv.slice(2)));
}
