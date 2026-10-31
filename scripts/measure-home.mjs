/** 新版首页帧率 + 滚出视口后是否停帧 */
const BASE = 'http://127.0.0.1:9222'
const SITE = process.argv[2] || 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const now = Date.now()
const cards = {}; const mk = (id, d) => { cards[id] = { wordId: id, stability: 9, difficulty: 5, due: now + d, reps: 4, lapses: 1, state: 'review', lastReview: now - 86400000, mastered: false } }
mk('en-cet4-0', -7200000); mk('en-cet4-1', -3600000)
const store = { state: { profile: { name: 'T', xp: 1480, gems: 42, streak: 6, longestStreak: 9, lastStudyDay: new Date().toISOString().slice(0,10), petXp: 3020, seasonPoints: 0, totalReviews: 8, correctReviews: 6 }, settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 12, sound: false, targetLang: 'en', activeDecks: ['en-cet4'], onboarded: true }, cards, logs: [], runs: [], achievements: [] }, version: 0 }
const targets = await (await fetch(`${BASE}/json`)).json()
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
let seq = 0; const pending = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } }
await new Promise((r) => (ws.onopen = r))
const send = (m, p = {}) => new Promise((res) => { const i = ++seq; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })) })
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }))?.result?.value
await send('Page.enable'); await send('Runtime.enable')

const fps = `new Promise(res => { let n = 0; const t0 = performance.now(); (function tick(){ n++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else res(+(n / ((performance.now()-t0)/1000)).toFixed(1)); })(); })`

for (const c of [{ n: 'desktop', w: 1440, h: 900, dsf: 1, mobile: false }, { n: 'mobile', w: 390, h: 844, dsf: 2, mobile: true }]) {
  await send('Emulation.setDeviceMetricsOverride', { width: c.w, height: c.h, deviceScaleFactor: c.dsf, mobile: c.mobile })
  await send('Page.navigate', { url: SITE }); await sleep(800)
  await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)
  await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/` }); await sleep(2200)
  const a = await ev(fps)
  const parts = await ev(`document.querySelector('canvas') ? 'has-canvas' : 'none'`)
  // 滚到下方，等一帧确认已经停掉
  await ev(`window.scrollTo(0, window.innerHeight + 200)`)
  await sleep(900)
  const b = await ev(fps)
  console.log(`${c.n}: 首屏 ${a} fps · 滚走后 ${b} fps · ${parts}`)
}
ws.close()
