import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const now = Date.now()

const cards = {}
const mk = (id, dueOffset, reps = 4, mastered = false) => {
  cards[id] = {
    wordId: id,
    stability: 8,
    difficulty: 5,
    due: now + dueOffset,
    reps,
    lapses: 1,
    state: 'review',
    lastReview: now - 4 * 86400000,
    mastered,
  }
}
mk('en-cet4-0', -7200000, 5, true)
mk('en-cet4-1', -3600000, 3, true)
mk('en-cet4-2', -1000)
mk('en-kaoyan-0', -3600000)
mk('en-kaoyan-1', 86400000)

const store = {
  state: {
    profile: {
      name: '旅行者',
      xp: 620,
      gems: 9,
      streak: 4,
      longestStreak: 7,
      lastStudyDay: new Date().toISOString().slice(0, 10),
      petXp: 620,
      seasonPoints: 620,
      totalReviews: 42,
      correctReviews: 36,
    },
    settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 10, sound: false, targetLang: 'en', activeDecks: ['en-cet4'], onboarded: true },
    cards,
    logs: [],
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
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result)
    pending.delete(m.id)
  } else if (m.method === 'Runtime.exceptionThrown') errs.push(m)
}
await new Promise((r) => (ws.onopen = r))
const send = (method, params = {}) =>
  new Promise((res) => {
    const i = ++seq
    pending.set(i, res)
    ws.send(JSON.stringify({ id: i, method, params }))
  })
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.value
const shot = async (name) => {
  const s = await send('Page.captureScreenshot', { format: 'png' })
  fs.mkdirSync('../shots', { recursive: true })
  fs.writeFileSync(`../shots/${name}.png`, Buffer.from(s.data, 'base64'))
}
const rows = () => ev(`JSON.stringify([...document.querySelectorAll('.lib-row')].map(r => r.querySelector('h2')?.innerText))`)
const panel = () => ev(`document.querySelector('aside .card')?.innerText.replace(/\\n/g, ' | ').slice(0, 160)`)

async function seed(width, height, mobile) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
  await send('Page.navigate', { url: SITE })
  await sleep(1000)
  await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)
  await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/library` })
  await sleep(2200)
}

await send('Page.enable')
await send('Runtime.enable')

// ---------- PC ----------
await seed(1440, 900, false)
console.log('PC 学段数 :', await ev(`document.querySelectorAll('.rail-item').length`))
console.log('PC 行     :', await rows())
console.log('PC 详情   :', await panel())
await shot('lib-v2-pc')

// 切学段
await ev(`(() => { const b = [...document.querySelectorAll('.rail-item')].find(x => x.innerText.includes('考研')); b?.click(); return !!b })()`)
await sleep(600)
console.log('考研      :', await rows())
console.log('考研详情  :', await panel())

// 排序：词数
await ev(`(() => { const b = [...document.querySelectorAll('.seg button')].find(x => x.innerText.trim() === '词数'); b?.click(); return !!b })()`)
await sleep(500)
console.log('按词数    :', await rows())
await ev(`(() => { const b = [...document.querySelectorAll('.seg button')].find(x => x.innerText.trim() === '推荐'); b?.click(); return !!b })()`)
await sleep(300)

// 点第二行 → 详情切换
await ev(`(() => { const r = document.querySelectorAll('.lib-row')[1]; r?.click(); return !!r })()`)
await sleep(500)
console.log('选第二行  :', await ev(`document.querySelector('aside .card h2')?.innerText`))
console.log('抽屉出现？:', await ev(`!!document.querySelector('.fixed.inset-0.z-50')`))

// 详情里点「开始学习」应进入 /learn
await ev(`(() => { const b = [...document.querySelectorAll('aside button')].find(x => /学习/.test(x.innerText)); b?.click(); return !!b })()`)
await sleep(1500)
console.log('开始学习  :', await ev(`JSON.stringify({ hash: location.hash, decks: JSON.parse(localStorage.getItem('wordquest-v1')).state.settings.activeDecks })`))

// ---------- 移动 ----------
await seed(390, 844, true)
console.log('M 行      :', await rows())
await ev(`(() => { const r = document.querySelectorAll('.lib-row')[0]; r?.click(); return !!r })()`)
await sleep(600)
console.log('M 抽屉    :', await ev(`JSON.stringify({ open: !!document.querySelector('.fixed.inset-0.z-50'), title: document.querySelector('.fixed.inset-0.z-50 h2')?.innerText })`))
await shot('lib-v2-m-sheet')
await ev(`(() => { const b = document.querySelector('.fixed.inset-0.z-50 header button, .fixed.inset-0.z-50 [aria-label="关闭"]'); b?.click(); return !!b })()`)
await sleep(500)
console.log('关闭后    :', await ev(`!!document.querySelector('.fixed.inset-0.z-50')`))
await shot('lib-v2-m')

console.log('ERRORS    :', errs.length)
ws.close()
