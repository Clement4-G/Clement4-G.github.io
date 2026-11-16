// Accès au contenu bilingue et contrôle de sa cohérence.

export function localize(node, lang) {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  return node[lang] || node.fr || '';
}

function checkTranslations(node, path, errors) {
  if (Array.isArray(node)) {
    node.forEach((item, i) => checkTranslations(item, `${path}[${i}]`, errors));
    return;
  }
  if (node === null || typeof node !== 'object') return;
  if (typeof node.fr === 'string') {
    if (!node.fr.trim()) errors.push(`${path}: fr manquant`);
    if (typeof node.en !== 'string' || !node.en.trim()) errors.push(`${path}: en manquant`);
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    checkTranslations(value, path ? `${path}.${key}` : key, errors);
  }
}

export function validateContent(content) {
  const errors = [];
  checkTranslations(content, '', errors);

  const paintings = content.paintings || {};
  for (const room of content.rooms || []) {
    for (const id of room.paintings || []) {
      if (!paintings[id]) errors.push(`rooms.${room.id}: tableau inconnu "${id}"`);
    }
  }
  (content.skills || []).forEach((skill, i) => {
    if (!paintings[skill.proofPainting]) {
      errors.push(`skills[${i}]: preuve inconnue "${skill.proofPainting}"`);
    }
  });
  (content.counters || []).forEach((counter, i) => {
    if (!paintings[counter.painting]) {
      errors.push(`counters[${i}]: tableau inconnu "${counter.painting}"`);
    }
  });
  // une faute de frappe ici ferait disparaître un tableau sans bruit : on la refuse
  for (const [id, roomId] of Object.entries(content.fastPlacement || {})) {
    if (!paintings[id]) errors.push(`fastPlacement: tableau inconnu "${id}"`);
    if (!(content.rooms || []).some((r) => r.id === roomId)) errors.push(`fastPlacement: salle inconnue "${roomId}"`);
  }
  if (content.featured && !paintings[content.featured]) errors.push(`featured: tableau inconnu "${content.featured}"`);
  return errors;
}
