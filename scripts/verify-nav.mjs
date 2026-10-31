/** 逐个点击七个轨道标签，确认落点正确；并检查子页面是否有返回入口 */
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

const center = async (label) => ev(`(() => {
  const el = Array.from(document.querySelectorAll('.orbit-item')).find((e) => e.textContent.includes('${label}'));
  if (!el) return null; const r = el.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
})()`)

const cases = [['闪卡', '/learn'], ['抽屉复习', '/learn?mode=due'], ['听力测验', '/games/echo'], ['拼写工坊', '/games/forge'], ['语法', '/grammar'], ['游戏', '/games'], ['词库', '/library']]
for (const [label, expect] of cases) {
  await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/` }); await sleep(1700)
  const p = await center(label)
  if (!p) { console.log(`${label}: NOT FOUND`); continue }
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
    await send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 })
    await sleep(60)
  }
  await sleep(750)
  const hash = await ev('decodeURIComponent(location.hash)')
  console.log(`${label.padEnd(5)} -> ${hash}  ${hash === '#' + expect ? 'OK' : 'MISMATCH expect ' + expect}`)
}

// 子页面是否都有回首页的路
for (const r of ['/learn', '/grammar', '/library', '/games', '/profile', '/settings']) {
  await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#${r}` }); await sleep(1400)
  const back = await ev(`(() => {
    const a = Array.from(document.querySelectorAll('a[href="#/"], a[href="/"]'));
    const btn = Array.from(document.querySelectorAll('button')).filter((b) => b.querySelector('svg'));
    return { homeLinks: a.length, bar: !!document.querySelector('a[href="#/"]') };
  })()`)
  console.log(`${r.padEnd(10)} 首页链接 ${back.homeLinks}`)
}
ws.close()
