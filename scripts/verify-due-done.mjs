import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const now = Date.now()

const cards = {
  'en-cet4-4': { wordId: 'en-cet4-4', stability: 3, difficulty: 5, due: now - 3600000, reps: 2, lapses: 1, state: 'review', lastReview: now - 4 * 86400000, mastered: false },
}
const store = {
  state: {
    profile: { name: '旅行者', xp: 200, gems: 3, streak: 1, longestStreak: 3, lastStudyDay: new Date().toISOString().slice(0, 10), petXp: 200, seasonPoints: 200, totalReviews: 10, correctReviews: 8 },
    settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 5, sound: false, targetLang: 'en', activeDecks: ['en-cet4'], onboarded: true },
    cards, logs: [], runs: [], achievements: [],
  },
  version: 0,
}

const targets = await (await fetch(`${BASE}/json`)).json()
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
let seq = 0
const pending = new Map()
const errs = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(m)
}
await new Promise((r) => (ws.onopen = r))
const send = (method, params = {}) => new Promise((res) => { const i = ++seq; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.value

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: SITE })
await sleep(1000)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)
await ev('location.hash = "#/learn?mode=due"; true')
await ev('location.reload(); true')
await sleep(2500)

console.log('START :', await ev(`JSON.stringify({ counter: (document.body.innerText.match(/\\d+ \\/ \\d+/)||['n/a'])[0] })`))
await ev(`document.querySelector('.card')?.click(); 1`)
await sleep(500)
await ev(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.trim().startsWith('忘了')); b?.click(); return !!b })()`)
await sleep(1400)

console.log('DONE  :', await ev(`JSON.stringify({
  h1: (document.querySelector('h1')||{}).innerText,
  btns: [...document.querySelectorAll('a.btn')].map(b => b.innerText.trim()),
  nextDueMin: Math.round((JSON.parse(localStorage.getItem('wordquest-v1')).state.cards['en-cet4-4'].due - Date.now()) / 60000),
})`))
const s = await send('Page.captureScreenshot', { format: 'png' })
fs.mkdirSync('../shots', { recursive: true })
fs.writeFileSync('../shots/due-done.png', Buffer.from(s.data, 'base64'))
console.log('ERRORS:', errs.length)
ws.close()
