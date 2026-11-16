// Choix de la langue et accès au stockage du navigateur sans jamais planter.

const LANGS = ['fr', 'en'];

export function detectLang({ search, stored, navigatorLang }) {
  const fromUrl = new URLSearchParams(search || '').get('lang');
  if (LANGS.includes(fromUrl)) return fromUrl;
  if (LANGS.includes(stored)) return stored;
  if ((navigatorLang || '').toLowerCase().startsWith('en')) return 'en';
  return 'fr';
}

export function safeStorage(kind) {
  const name = kind === 'session' ? 'sessionStorage' : 'localStorage';
  return {
    get(key) {
      try {
        return globalThis[name].getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        globalThis[name].setItem(key, value);
      } catch {
        // Stockage indisponible (navigation privée, blocage) : on continue sans mémoire.
      }
    },
  };
}
