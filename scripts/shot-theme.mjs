import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const now = Date.now()

const mkStore = (theme) => ({
  state: {
    profile: { name: '旅行者', xp: 620, gems: 9, streak: 4, longestStreak: 7, lastStudyDay: new Date().toISOString().slice(0, 10), petXp: 620, seasonPoints: 620, totalReviews: 42, correctReviews: 36 },
    settings: { uiLocale: 'zh', nativeLocale: 'zh', theme, dailyGoal: 10, sound: false, targetLang: 'en', activeDecks: ['en-cet4'], onboarded: true },
    cards: {
      'en-cet4-0': { wordId: 'en-cet4-0', stability: 9, difficulty: 5, due: now - 7200000, reps: 5, lapses: 1, state: 'review', lastReview: now - 4 * 86400000, mastered: true },
      'en-cet4-1': { wordId: 'en-cet4-1', stability: 7, difficulty: 5, due: now - 3600000, reps: 4, lapses: 0, state: 'review', lastReview: now - 3 * 86400000, mastered: false },
    },
    logs: [],
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
  else if (m.method === 'Runtime.exceptionThrown') errs.push(m)
}
await new Promise((r) => (ws.onopen = r))
const send = (method, params = {}) => new Promise((res) => { const i = ++seq; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.value
const shot = async (name) => {
  const s = await send('Page.captureScreenshot', { format: 'png' })
  fs.mkdirSync('../shots', { recursive: true })
  fs.writeFileSync(`../shots/${name}.png`, Buffer.from(s.data, 'base64'))
}

await send('Page.enable')
await send('Runtime.enable')

const theme = process.argv[2] ?? 'light'
const width = Number(process.argv[3] ?? 1440)
const height = Number(process.argv[4] ?? 900)
const mobile = width < 700

await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
await send('Page.navigate', { url: SITE })
await sleep(1000)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(mkStore(theme)))}); true`)
await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/library` })
await sleep(2200)

if (mobile) {
  await ev(`document.querySelectorAll('.lib-row')[0]?.click(); true`)
  await sleep(700)
}

await shot(`lib-${theme}${mobile ? '-m' : ''}`)
console.log('theme', theme, 'size', width, 'sheet', await ev(`!!document.querySelector('.fixed.inset-0.z-50')`), 'ERR', errs.length)
ws.close()
