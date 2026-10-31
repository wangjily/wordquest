const BASE = 'http://127.0.0.1:9222'
const SITE = 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const now = Date.now()
const cards = {}; const mk = (id, d) => { cards[id] = { wordId: id, stability: 9, difficulty: 5, due: now + d, reps: 4, lapses: 1, state: 'review', lastReview: now - 86400000, mastered: false } }
mk('en-cet4-0', -7200000); mk('en-cet4-1', -3600000); mk('en-cet4-2', -1800000)
const store = { state: { profile: { name: 'T', xp: 1480, gems: 42, streak: 6, longestStreak: 9, lastStudyDay: new Date().toISOString().slice(0,10), petXp: 3020, seasonPoints: 0, totalReviews: 8, correctReviews: 6 }, settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 12, sound: false, targetLang: 'en', activeDecks: ['en-cet4'], onboarded: true }, cards, logs: [], runs: [], achievements: [] }, version: 0 }
const list = await (await fetch(`${BASE}/json`)).json()
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
let seq = 0; const pending = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } }
await new Promise((r) => (ws.onopen = r))
const send = (m, p = {}) => new Promise((res) => { const i = ++seq; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })) })
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }))?.result?.value
await send('Page.enable'); await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: SITE }); await sleep(900)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)
await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/` }); await sleep(2400)

const info = await ev(`(() => {
  const hero = document.querySelector('.cosmos-hero');
  const hb = hero.getBoundingClientRect();
  const out = { hero: [hb.width, hb.height] };
  out.safe = [];
  hero.querySelectorAll('[data-orbit-safe]').forEach((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = Array.from(range.getClientRects()).map((r) => [Math.round(r.left - hb.left), Math.round(r.top - hb.top), Math.round(r.width), Math.round(r.height)]);
    out.safe.push([el.className || el.tagName, rects]);
  });
  out.items = Array.from(document.querySelectorAll('.orbit-item')).map((el) => {
    const r = el.getBoundingClientRect();
    return [el.textContent.trim(), Math.round(r.left - hb.left), Math.round(r.top - hb.top), Math.round(r.width), Math.round(r.height)];
  });
  out.navReady = document.querySelector('.orbit-nav').className;
  return out;
})()`)
console.log(JSON.stringify(info, null, 1))
ws.close()
