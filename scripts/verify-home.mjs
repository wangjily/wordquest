import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = process.argv[2] || 'http://127.0.0.1:4173/'
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

const store = {
  state: {
    profile: { name: '旅行者', xp: 1480, gems: 42, streak: 6, longestStreak: 9, lastStudyDay: new Date().toISOString().slice(0, 10), petXp: 3020, seasonPoints: 1480, totalReviews: 88, correctReviews: 74 },
    settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 12, sound: false, targetLang: 'en', activeDecks: ['en-cet4'], onboarded: true },
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
const shot = async (name) => {
  const s = await send('Page.captureScreenshot', { format: 'png' })
  fs.mkdirSync('../shots', { recursive: true })
  fs.writeFileSync(`../shots/${name}.png`, Buffer.from(s.data, 'base64'))
}

async function seed(width, height, mobile) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
  await send('Page.navigate', { url: SITE })
  await sleep(900)
  await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)
  await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/` })
  await sleep(2200)
}

await send('Page.enable')
await send('Runtime.enable')

await seed(1440, 900, false)
console.log('H1      :', await ev(`document.querySelector('h1')?.innerText`))
console.log('tiles   :', await ev(`document.querySelectorAll('a[href^="#/"] .lucide').length`))
console.log('计划    :', await ev(`(() => { const s = document.querySelector('section.card')?.innerText.replace(/\\n/g,' | '); return s?.slice(0,150) })()`))
await shot('home-v4-d')

// 搜索
await ev(`(() => { const i = document.querySelector('header input'); i.focus(); return true })()`)
await send('Input.insertText', { text: 'aban' })
await sleep(600)
console.log('结果数  :', await ev(`document.querySelectorAll('header button').length`))
console.log('首条    :', await ev(`document.querySelector('header .absolute button')?.innerText.replace(/\\n/g,' / ')`))
await shot('home-v4-search')
await ev(`document.querySelector('header .absolute button')?.click(); true`)
await sleep(500)
console.log('速查卡  :', await ev(`document.querySelector('.card-solid')?.innerText.replace(/\\n/g,' | ').slice(0,80)`))
await shot('home-v4-peek')
await ev(`document.querySelector('.card-solid [aria-label="关闭"]')?.click(); true`)
await sleep(300)

// 快捷模式跳转
await ev(`(() => { const a = [...document.querySelectorAll('a')].find(x => x.getAttribute('href') === '#/games/boss'); a?.click(); return !!a })()`)
await sleep(1400)
console.log('跳游戏  :', await ev(`location.hash`))
await ev(`location.hash = '#/'`)
await sleep(900)

// 移动端
await seed(390, 844, true)
await shot('home-v4-m')
console.log('M 计划  :', await ev(`document.querySelector('section.card')?.innerText.replace(/\\n/g,' | ').slice(0,120)`))

console.log('ERRORS  :', errs.length)
ws.close()
