import { test, expect } from 'bun:test';
import { detectLang, safeStorage } from '../src/i18n.js';
test('ordre de priorité : adresse, mémoire, navigateur, puis français', () => {
  expect(detectLang({ search: '?lang=en', stored: 'fr', navigatorLang: 'fr-FR' })).toBe('en');
  expect(detectLang({ search: '', stored: 'en', navigatorLang: 'fr-FR' })).toBe('en');
  expect(detectLang({ search: '', stored: null, navigatorLang: 'en-GB' })).toBe('en');
  expect(detectLang({ search: '', stored: null, navigatorLang: 'de-DE' })).toBe('fr');
  expect(detectLang({ search: '?lang=xx', stored: null, navigatorLang: 'fr' })).toBe('fr');
});
test('safeStorage ne lève jamais, même si le stockage est bloqué', () => {
  globalThis.sessionStorage = { getItem() { throw new Error('bloqué'); }, setItem() { throw new Error('bloqué'); } };
  const s = safeStorage('session');
  expect(s.get('x')).toBeNull();
  expect(() => s.set('x', '1')).not.toThrow();
});
