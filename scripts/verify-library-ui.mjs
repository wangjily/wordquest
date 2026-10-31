import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const now = Date.now()

const store = {
  state: {
    profile: { name: '旅行者', xp: 500, gems: 8, streak: 3, longestStreak: 6, lastStudyDay: new Date().toISOString().slice(0, 10), petXp: 500, seasonPoints: 500, totalReviews: 30, correctReviews: 26 },
    settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 10, sound: false, targetLang: 'en', activeDecks: ['en-cet4'], onboarded: true },
    cards: {}, logs: [], runs: [], achievements: [],
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
const titles = () => ev(`JSON.stringify([...document.querySelectorAll('h2')].map(h => h.innerText))`)

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
await send('Page.navigate', { url: SITE })
await sleep(1000)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)
await ev('location.hash = "#/library"; true')
await ev('location.reload(); true')
await sleep(2400)

console.log('四级     :', await titles())

await ev(`(() => { const b = [...document.querySelectorAll('nav button')].find(x => x.innerText.trim() === '考研考博'); b?.click(); return !!b })()`)
await sleep(700)
console.log('考研     :', await titles())
console.log('pills    :', await ev(`JSON.stringify([...document.querySelectorAll('.paper-pill')].map(p => p.innerText))`))
await shot('lib-kaoyan')

await ev(`(() => { const b = [...document.querySelectorAll('.paper-pill')].find(x => x.innerText.trim() === '真题'); b?.click(); return !!b })()`)
await sleep(600)
console.log('考研+真题:', await titles())
await shot('lib-kaoyan-zhenti')

// 搜索
await ev(`(() => {
  const i = document.querySelector('input')
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  setter.call(i, '雅思')
  i.dispatchEvent(new Event('input', { bubbles: true }))
  return i.value
})()`)
await sleep(600)
console.log('搜索雅思 :', await titles())
await shot('lib-search')

// 空分类
await ev(`(() => { const i = document.querySelector('input'); i.value=''; i.dispatchEvent(new Event('input',{bubbles:true})); return 1 })()`)
await sleep(300)
await ev(`(() => { const b = [...document.querySelectorAll('nav button')].find(x => x.innerText.trim() === '其他'); b?.click(); return !!b })()`)
await sleep(700)
console.log('其他     :', await titles())
await shot('lib-other')

console.log('ERRORS:', errs.length)
ws.close()
