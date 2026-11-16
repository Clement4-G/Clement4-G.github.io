// Durée d'affichage de l'écran de chargement à la première visite.
// Le minimum est compté depuis l'ouverture de la page ; si le site a été long à se préparer,
// l'écran reste encore un moment une fois prêt, pour qu'on ait toujours le temps de lire.
export const LOADER_MIN_MS = 7000;
export const LOADER_TAIL_MS = 2500;

export function loaderWait({ first, skipped, now }) {
  if (!first || skipped) return 0;
  return Math.max(LOADER_MIN_MS - now, LOADER_TAIL_MS);
}
