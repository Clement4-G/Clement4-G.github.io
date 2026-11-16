// Essai de fumée : pilote un navigateur (Edge ou Chrome lancé avec --remote-debugging-port) pour
// cliquer sur les boutons du site et relever le mode, la salle et les erreurs après chaque clic.
// Usage : bun scripts/smoke.js <port> <url>. Les tests unitaires ne voient pas les pannes de la 3D ; lui, si.
const [port, url] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let target = null;
for (let i = 0; i < 40 && !target; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    target = list.find((t) => t.type === 'page');
  } catch {
    await sleep(500);
  }
}
if (!target) throw new Error('navigateur injoignable');

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});
let seq = 0;
const waiting = new Map();
const errors = [];
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && waiting.has(msg.id)) {
    waiting.get(msg.id)(msg);
    waiting.delete(msg.id);
  }
  if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
  if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
    errors.push(`${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300)}`);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++seq;
    waiting.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
const js = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  return r.result?.result?.value ?? r.result?.exceptionDetails?.text;
};
const state = () =>
  js(`JSON.stringify({
    mode: document.documentElement.dataset.mode,
    bouton: document.getElementById('mode-toggle')?.textContent,
    carte: (() => { const m = document.querySelector('.map'); return m ? !m.hidden : null; })(),
    galerie: (() => { const g = document.querySelector('.gallery'); return g ? (!g.hidden && getComputedStyle(g).opacity) : null; })(),
    salle: document.querySelector('.hud__room')?.textContent || null,
    panneau: Boolean(document.querySelector('.panel')),
    defilement: Math.round(window.scrollY),
    csp: (window.__csp || []).length,
  })`);
const step = async (label, action, wait = 2500) => {
  const before = errors.length;
  if (action) await js(action);
  await sleep(wait);
  console.log(`\n== ${label}\n${await state()}`);
  for (const e of errors.slice(before)) console.log(`   ERREUR ${String(e).slice(0, 400)}`);
  const refused = await js('JSON.stringify(window.__csp || [])');
  if (refused && refused !== '[]') console.log(`   CSP REFUSÉ ${refused.slice(0, 400)}`);
};

await send('Runtime.enable');
await send('Page.enable');
// chaque refus de la politique de sécurité (CSP) est noté par la page et relevé à chaque étape
await send('Page.addScriptToEvaluateOnNewDocument', { source: "window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' ' + (e.blockedURI || '')));" });
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 850, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });
await step('chargement', null, 6000);
await step('clic « Commencer la visite »', "document.querySelector('.map__cta')?.click()", 6000);
await step("clic « ← Carte »", "document.querySelector(\".hud .btn\")?.click()", 9000);
await step('clic sur la salle 03 de la carte', "document.querySelector('.map__room[data-room=\"stack\"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))", 5000);
await step("clic « ← Carte »", "document.querySelector(\".hud .btn\")?.click()", 9000);
await step('clic « Version rapide »', "document.getElementById('mode-toggle').click()", 2000);
await step('clic « Version musée »', "document.getElementById('mode-toggle').click()", 6000);
await step('clic sur la salle 04 de la carte', "document.querySelector('.map__room[data-room=\"apropos\"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))", 5000);
await step('touche E devant rien, puis lien direct tableau', "window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }))", 1000);
ws.close();
process.exit(0);
