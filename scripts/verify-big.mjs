import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const baseStore = (activeDecks) => ({
  state: {
    profile: { name: '旅行者', xp: 620, gems: 9, streak: 4, longestStreak: 7, lastStudyDay: new Date().toISOString().slice(0, 10), petXp: 620, seasonPoints: 620, totalReviews: 42, correctReviews: 36 },
    settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 10, sound: false, targetLang: 'en', activeDecks, onboarded: true },
    cards: {}, logs: [], runs: [], achievements: [],
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
async function seed(activeDecks, hash, width = 1440, height = 940) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 })
  await send('Page.navigate', { url: SITE })
  await sleep(900)
  await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(baseStore(activeDecks)))}); true`)
  await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#${hash}` })
  await sleep(2000)
}

await send('Page.enable')
await send('Runtime.enable')

/* ---------- 1. 词库页：四级学段应有 4 本，含 2607 词的那本 ---------- */
await seed(['en-cet4'], '/library')
await ev(`(() => { const b = [...document.querySelectorAll('.rail-item')].find(x => /四级/.test(x.innerText)); b?.click() })()`)
await sleep(700)
console.log('四级书目 :', await ev(`JSON.stringify([...document.querySelectorAll('.lib-row h2')].map(h => h.innerText))`))
console.log('四级词数 :', await ev(`JSON.stringify([...document.querySelectorAll('.lib-row')].filter(r => r.querySelector('h2')).map(r => r.innerText.replace(/\\n/g,' | ').slice(0,60)))`))
// 选中「大纲全量」看详情
await ev(`(() => { const r = [...document.querySelectorAll('.lib-row')].find(x => /大纲全量/.test(x.innerText)); r?.click() })()`)
await sleep(600)
console.log('全量详情 :', await ev(`[...document.querySelectorAll('aside')].pop()?.innerText.replace(/\\n/g,' | ')`))
await shot('big-cet4-detail')

/* ---------- 2. 学习页：只有释义的词不出现空例句块 ---------- */
await seed(['en-cet4-full'], '/learn')
console.log('学习页 h1:', await ev(`document.querySelector('h1')?.innerText`))
await ev(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })); true`)
await sleep(500)
await ev(`(() => { const c = document.querySelector('[data-reveal], .card'); c?.click() })()`)
await sleep(300)
// 依次翻几张，统计「空例句提示」出现次数
let noEx = 0
let withEx = 0
for (let i = 0; i < 6; i++) {
  const t = await ev(`document.body.innerText`)
  if (String(t).includes('这本词书只收释义')) noEx++
  if (String(t).includes('例句\n')) withEx++
  await ev(`(() => { const b = [...document.querySelectorAll('button')].find(x => /记得/.test(x.innerText)); b?.click() })()`)
  await sleep(450)
  await ev(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })); true`)
  await sleep(300)
}
console.log('翻 6 张：空例句提示', noEx, '次 / 有例句', withEx, '次')
await shot('big-learn-noexample')

/* ---------- 3. 队列去重：核心词 + 全量同时勾选 ---------- */
await seed(['en-cet4', 'en-cet4-full'], '/')
console.log('首页计划 :', await ev(`document.body.innerText.split('\\n').filter(l => /新词|待复习/.test(l)).join(' | ')`))
const q = await ev(`(() => {
  const s = JSON.parse(localStorage.getItem('wordquest-v1'))
  return JSON.stringify(s.state.settings.activeDecks)
})()`)
console.log('在学词书 :', q)

console.log('ERRORS   :', errs.length)
ws.close()
