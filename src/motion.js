// Animations : le réglage du système décide par défaut, mais le visiteur peut le contredire
// (beaucoup de portables Windows coupent les animations pour gagner en vitesse).
// Dans l'adresse, ?anim=1 les force et ?anim=0 les coupe, avant tout autre réglage.
export function resolveReducedMotion({ prefersReduced, stored, search = '' }) {
  const forced = new URLSearchParams(search).get('anim');
  if (forced === '1') return false;
  if (forced === '0') return true;
  if (stored === 'on') return false;
  if (stored === 'off') return true;
  return Boolean(prefersReduced);
}
