/**
 * 助手面板关闭途径验证：X 按钮 / Esc / 点面板外
 * node scripts/verify-assistant-close.mjs [url]
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
const panelOpen = () => ev(`document.body.innerText.includes('词跃助手')`)

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 940, deviceScaleFactor: 1, mobile: false })
await send('Network.setCacheDisabled', { cacheDisabled: true })
await send('Page.navigate', { url: SITE })
await sleep(800)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)
await send('Page.navigate', { url: SITE + '?r=' + Date.now() + '#/' })
await sleep(2200)

const openPanel = async () => {
  await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='打开 AI 助手'); b?.click() })()`)
  await sleep(500)
}

// 1) 打开后有没有 X
await openPanel()
console.log('面板已打开:', await panelOpen())
console.log('关闭按钮存在:', await ev(`Boolean([...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label')==='关闭助手'))`))
await shot('assistant-close-btn')

// 2) 点 X
await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label')==='关闭助手'); b?.click() })()`)
await sleep(450)
console.log('点 X 后已关闭:', !(await panelOpen()))

// 3) Esc
await openPanel()
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
await sleep(400)
console.log('Esc 后已关闭:', !(await panelOpen()))

// 4) 点面板外（左侧空白）
await openPanel()
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 200, y: 400, button: 'left', clickCount: 1 })
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 200, y: 400, button: 'left', clickCount: 1 })
await sleep(400)
console.log('点遮罩后已关闭:', !(await panelOpen()))

ws.close()
