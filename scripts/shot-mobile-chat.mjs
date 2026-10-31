/**
 * 移动端助手面板截图（空态 + 讲笑话后）
 * node scripts/shot-mobile-chat.mjs [url]
 */
import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = process.argv[2] || 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const store = {
  state: {
    profile: { name: '旅行者', xp: 620, gems: 9, streak: 4, longestStreak: 7, lastStudyDay: new Date().toISOString().slice(0, 10), petXp: 620, seasonPoints: 620, totalReviews: 42, correctReviews: 36 },
    settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 10, sound: false, targetLang: 'en', activeDecks: ['en-cet4'], onboarded: true },
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
await sleep(900)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)
await send('Page.navigate', { url: SITE + '?r=' + Date.now() + '#/' })
await sleep(2400)

await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='打开 AI 助手'); b?.click() })()`)
await sleep(700)
await shot('m-chat-empty')

// 点「讲个笑话」
await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='讲个笑话'); b?.click() })()`)
await sleep(900)
await shot('m-chat-joke')

// 再点「陪我聊两句」
await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='陪我聊两句'); b?.click() })()`)
await sleep(900)
await shot('m-chat-trivia')

console.log('ok')
ws.close()
