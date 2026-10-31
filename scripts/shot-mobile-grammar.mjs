/**
 * 移动端截图：首页快捷入口 → 语法列表 → 答题
 * node scripts/shot-mobile-grammar.mjs [url]
 */
import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = process.argv[2] || 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const store = {
  state: {
    profile: { name: '旅行者', xp: 620, gems: 9, streak: 4, longestStreak: 7, lastStudyDay: new Date().toISOString().slice(0, 10), petXp: 620, seasonPoints: 620, totalReviews: 42, correctReviews: 36 },
    settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 10, sound: true, targetLang: 'en', activeDecks: ['en-cet4'], onboarded: true },
    cards: {}, logs: [], runs: [], achievements: [],
  },
  version: 0,
}

const targets = await (await fetch(BASE + '/json')).json()
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
let seq = 0
const pending = new Map()
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result)
    pending.delete(m.id)
  }
}
await new Promise((r) => (ws.onopen = r))
const send = (method, params = {}) =>
  new Promise((res) => {
    const id = ++seq
    pending.set(id, res)
    ws.send(JSON.stringify({ id, method, params }))
  })
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r?.exceptionDetails) return `ERR:${r.exceptionDetails.text}`
  return r?.result?.value
}
const shot = async (name) => {
  const s = await send('Page.captureScreenshot', { format: 'png' })
  fs.mkdirSync('../shots', { recursive: true })
  fs.writeFileSync(`../shots/${name}.png`, Buffer.from(s.data, 'base64'))
}

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Network.setCacheDisabled', { cacheDisabled: true })
await send('Page.navigate', { url: SITE })
await sleep(800)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)

await send('Page.navigate', { url: SITE + '?r=' + Date.now() + '#/' })
await sleep(2600)
console.log('底栏项数:', await ev(`document.querySelectorAll('nav a').length`))
console.log('首页有没有语法入口:', await ev(`[...document.querySelectorAll('a')].some(a => a.getAttribute('href')?.includes('/grammar'))`))
await shot('m-home-grammar')

await send('Page.navigate', { url: SITE + '#/grammar' })
await sleep(1800)
await shot('m-grammar-list')

await ev(`document.querySelector('button.group')?.click()`)
await sleep(700)
await ev(`(() => { const bs=[...document.querySelectorAll('.rounded-\\\\[20px\\\\] button')]; bs[1]?.click() })()`)
await sleep(600)
await shot('m-grammar-quiz')
console.log('已答题反馈:', await ev(`document.body.innerText.includes('答对') || document.body.innerText.includes('答错')`))
ws.close()
