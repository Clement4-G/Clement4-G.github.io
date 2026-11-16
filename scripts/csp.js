// En production, la politique de sécurité est réécrite au plus strict : rien n'est permis par défaut,
// seuls les scripts, styles et images du site lui-même (plus les miniatures en data:) sont acceptés.
// La version de développement garde ses ouvertures, nécessaires au serveur de Vite.
export const PRODUCTION_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
].join('; ');

export function productionCsp(html) {
  // si la balise n'est pas trouvée, la construction échoue : jamais de publication avec la politique de développement
  if (!/http-equiv="Content-Security-Policy"\s+content="/.test(html)) throw new Error('politique de sécurité introuvable dans index.html : construction arrêtée');
  return html.replace(/(http-equiv="Content-Security-Policy"\s+content=")([^"]*)(")/, (_, start, __, end) => start + PRODUCTION_CSP + end);
}
