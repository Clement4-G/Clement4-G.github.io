import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { productionCsp } from '../scripts/csp.js';

test('en production, la politique de sécurité perd les ouvertures du serveur de développement', () => {
  const html = productionCsp(readFileSync('index.html', 'utf8'));
  const csp = html.match(/Content-Security-Policy"\s+content="([^"]+)"/)[1];
  expect(csp).not.toContain('ws:'); expect(csp).not.toContain('wss:'); expect(csp).not.toContain('worker-src');
  expect(csp).toContain("connect-src 'self'"); expect(csp).toContain("script-src 'self'"); expect(csp).toContain("object-src 'none'");
});
test('la politique de production est la plus stricte que le site supporte', () => {
  const csp = productionCsp(readFileSync('index.html', 'utf8')).match(/Content-Security-Policy"\s+content="([^"]+)"/)[1];
  expect(csp).toContain("default-src 'none'"); expect(csp).not.toContain('unsafe-inline'); expect(csp).not.toContain('blob:');
  expect(csp).toContain("img-src 'self' data:"); expect(csp).toContain("base-uri 'none'");
});
test('si la politique n\'a pas pu être remplacée, la construction échoue au lieu de publier la version de développement', () => {
  expect(() => productionCsp('<html><head></head></html>')).toThrow();
});
