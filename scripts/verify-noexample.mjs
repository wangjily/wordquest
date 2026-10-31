import fs from 'node:fs'
const BASE = 'http://127.0.0.1:9222'
const SITE = 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const now = Date.now()

// 构造一张「已到期」的卡，指向大纲全量里靠后的词（无例句）
const card = (id, offset = -3600000) => ({
  wordId: id, stability: 8, difficulty: 5, due: now + offset,
  reps: 3, lapses: 0, state: 'review', lastReview: now - 86400000, mastered: false,
})
const store = {
  state: {
    profile: { name: '旅行者', xp: 620, gems: 9, streak: 4, longestStreak: 7, lastStudyDay: new Date().toISOString().slice(0, 10), petXp: 620, seasonPoints: 620, totalReviews: 42, correctReviews: 36 },
    settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 10, sound: false, targetLang: 'en', activeDecks: ['en-cet4-full'], onboarded: true },
    cards: { 'en-cet4-full-900': card('en-cet4-full-900') },
    logs: [], runs: [], achievements: [],
  },
  version: 0,
}

const t = await (await fetch(BASE + '/json')).json()
const ws = new WebSocket(t.find((x) => x.type === 'page').webSocketDebuggerUrl)
let seq = 0
const p = new Map()
const errs = []
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && p.has(m.id)) { p.get(m.id)(m.result); p.delete(m.id) } else if (m.method === 'Runtime.exceptionThrown') errs.push(m) }
await new Promise((r) => (ws.onopen = r))
const send = (m, q = {}) => new Promise((res) => { const i = ++seq; p.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: q })) })
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }))?.result?.value
await send('Page.enable'); await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: SITE }); await sleep(900)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)
await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/learn?mode=due` }); await sleep(2000)
console.log('词      :', await ev(`document.querySelector('h1')?.innerText`))
await ev(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })); true`)
await sleep(700)
console.log('背面    :', await ev(`document.body.innerText.replace(/\\n+/g, ' | ').slice(0, 220)`))
const s = await send('Page.captureScreenshot', { format: 'png' })
fs.mkdirSync('../shots', { recursive: true })
fs.writeFileSync('../shots/big-noexample.png', Buffer.from(s.data, 'base64'))
console.log('ERRORS  :', errs.length)
ws.close()
