/** 诊断首页/学习页的发音链路：点了喇叭之后音频元素到底怎么走的 */
const BASE = 'http://127.0.0.1:9222'
const SITE = process.argv[2] || 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const now = Date.now()
const store = {
  state: {
    profile: { name: 'T', xp: 100, gems: 2, streak: 1, longestStreak: 1, lastStudyDay: new Date().toISOString().slice(0, 10), petXp: 100, seasonPoints: 100, totalReviews: 5, correctReviews: 5 },
    settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 12, sound: true, targetLang: 'en', activeDecks: ['en-cet4'], onboarded: true },
    cards: {}, logs: [], runs: [], achievements: [],
  },
  version: 0,
}
const list = await (await fetch(`${BASE}/json`)).json()
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
let seq = 0
const pending = new Map()
const reqs = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
  else if (m.method === 'Network.responseReceived') {
    const u = m.params.response.url
    if (/dictvoice|gettts/.test(u)) reqs.push(`${m.params.response.status} ${u.slice(0, 90)}`)
  }
}
await new Promise((r) => (ws.onopen = r))
const send = (m, p = {}) => new Promise((res) => { const i = ++seq; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })) })
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }))?.result?.value
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: SITE }); await sleep(900)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)
await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/learn` }); await sleep(2200)

// 找喇叭按钮（词条右侧那个）
const btn = await ev(`(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => x.getAttribute('aria-label') === '朗读');
  const all = Array.from(document.querySelectorAll('button')).map((x) => [x.getAttribute('aria-label'), x.textContent.trim().slice(0,8)]);
  return { target: b ? b.getAttribute('aria-label') : null, all: all.slice(0, 12), audio: document.querySelectorAll('#wq-audio audio').length };
})()`)
console.log('buttons', JSON.stringify(btn))

const pos = await ev(`(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => x.getAttribute('aria-label') === '朗读');
  if (!b) return null; const r = b.getBoundingClientRect();
  return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), label: b.getAttribute('aria-label') };
})()`)
console.log('speaker at', JSON.stringify(pos))
if (pos) {
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
    await send('Input.dispatchMouseEvent', { type, x: pos.x, y: pos.y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 })
    await sleep(50)
  }
}
await sleep(1800)

const state = await ev(`(() => {
  const els = Array.from(document.querySelectorAll('#wq-audio audio'));
  return els.map((a) => ({ src: (a.currentSrc || a.src || '').slice(-50), paused: a.paused, t: +a.currentTime.toFixed(2), dur: +(a.duration || 0).toFixed(2), ready: a.readyState, net: a.networkState, err: a.error ? a.error.code : null, muted: a.muted, vol: a.volume, rate: a.playbackRate })).filter((x) => x.src);
})()`)
console.log('audio elements after click:')
for (const s of state) console.log(' ', JSON.stringify(s))
console.log('tts speaking:', await ev(`window.speechSynthesis ? window.speechSynthesis.speaking : 'no-tts'`))
console.log('network:', reqs.slice(-6))
ws.close()
