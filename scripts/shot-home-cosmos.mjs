/** 新版首页截图：深色桌面/手机、浅色桌面、首屏以下 */
import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = process.argv[2] || 'http://127.0.0.1:4173/'
const OUT = 'C:/Users/孙续/WorkBuddy/2026-10-27-22-11-41/shots'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const now = Date.now()

const cards = {}
const mk = (id, dueOffset, reps = 4, lapses = 0, mastered = false) => {
  cards[id] = { wordId: id, stability: 9, difficulty: 5, due: now + dueOffset, reps, lapses, state: 'review', lastReview: now - 86400000, mastered }
}
mk('en-cet4-0', -7200000, 5, 2, true)
mk('en-cet4-1', -3600000, 4, 1)
mk('en-cet4-2', -1800000, 3, 1)
mk('en-cet4-3', 86400000, 1, 0)

const makeStore = (theme) => ({
  state: {
    profile: { name: '旅行者', xp: 1480, gems: 42, streak: 6, longestStreak: 9, lastStudyDay: new Date().toISOString().slice(0, 10), petXp: 3020, seasonPoints: 1480, totalReviews: 88, correctReviews: 74 },
    settings: { uiLocale: 'zh', nativeLocale: 'zh', theme, dailyGoal: 12, sound: false, targetLang: 'en', activeDecks: ['en-cet4'], onboarded: true },
    cards,
    logs: [
      { wordId: 'en-cet4-0', rating: 3, source: 'card', elapsed: 3000, at: now - 3600000, correct: true },
      { wordId: 'en-cet4-1', rating: 3, source: 'card', elapsed: 2600, at: now - 3400000, correct: true },
      { wordId: 'en-cet4-2', rating: 1, source: 'falling', elapsed: 4200, at: now - 3200000, correct: false },
    ],
    runs: [],
    achievements: [],
  },
  version: 0,
})

const targets = await (await fetch(`${BASE}/json`)).json()
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
let seq = 0
const pending = new Map()
const errs = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.text)
}
await new Promise((r) => (ws.onopen = r))
const send = (method, params = {}) => new Promise((res) => { const i = ++seq; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.value
const shot = async (name) => {
  const s = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(s.data, 'base64'))
  console.log(name)
}
await send('Page.enable'); await send('Runtime.enable')

const cases = [
  { name: 'newhome-dark-d', w: 1440, h: 900, dsf: 1, mobile: false, theme: 'dark' },
  { name: 'newhome-dark-m', w: 390, h: 844, dsf: 2, mobile: true, theme: 'dark' },
  { name: 'newhome-light-d', w: 1440, h: 900, dsf: 1, mobile: false, theme: 'light' },
  { name: 'newhome-light-m', w: 390, h: 844, dsf: 2, mobile: true, theme: 'light' },
]

for (const c of cases) {
  await send('Emulation.setDeviceMetricsOverride', { width: c.w, height: c.h, deviceScaleFactor: c.dsf, mobile: c.mobile })
  await send('Page.navigate', { url: SITE })
  await sleep(800)
  await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(makeStore(c.theme)))}); true`)
  await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/` })
  await sleep(2600)
  await shot(c.name)

  // 首屏以下
  await ev(`window.scrollTo(0, window.innerHeight - 40)`)
  await sleep(700)
  await shot(c.name.replace('newhome', 'newhome-below'))
}

console.log('js errors:', errs.length, errs.slice(0, 3))
ws.close()
