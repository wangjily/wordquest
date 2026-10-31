/** 最终展示截图 */
import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = 'http://127.0.0.1:4173/'
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
  return r?.result?.value
}
const shot = async (name) => {
  const s = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(`../shots/${name}.png`, Buffer.from(s.data, 'base64'))
}

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 940, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: SITE })
await sleep(700)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)

// 1. 词库：自然拼读（3 本）
await send('Page.navigate', { url: SITE + '?r=' + Date.now() + '#/library' })
await sleep(2400)
await ev(`(() => { const b = [...document.querySelectorAll('.rail-item')].find(x => x.innerText.includes('自然拼读')); b?.click() })()`)
await sleep(600)
await shot('v3f-library-pc')

// 2. 词库：日语（5 本）
await ev(`(() => { const b = [...document.querySelectorAll('.rail-item')].find(x => x.innerText.includes('日语')); b?.click() })()`)
await sleep(700)
await shot('v3f-library-jp')

// 3. 搜索面板
await send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 2, key: 'k', code: 'KeyK', windowsVirtualKeyCode: 75 })
await send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 2, key: 'k', code: 'KeyK', windowsVirtualKeyCode: 75 })
await sleep(500)
await ev(`(() => {
  const el = document.querySelector('input[placeholder*="输入英文"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, 'aband');
  el.dispatchEvent(new Event('input', { bubbles: true }));
})()`)
await sleep(600)
await shot('v3f-search')

// 4. 助手
await send('Page.navigate', { url: SITE + '?r=' + Date.now() + '#/' })
await sleep(1800)
await ev(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === '打开 AI 助手'); b?.click() })()`)
await sleep(700)
for (const q of ['今天该学什么', '考我 5 个词']) {
  await ev(`(() => { const el = document.querySelector('textarea[placeholder]'); el.focus(); })()`)
  await send('Input.insertText', { text: q })
  await sleep(150)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  await sleep(850)
}
await shot('v3f-assistant')

// 5. 移动端
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
await send('Page.navigate', { url: SITE + '?r=' + Date.now() + '#/library' })
await sleep(2200)
await ev(`(() => { const b = [...document.querySelectorAll('.chip-btn')].find(x => x.innerText.includes('日语')); b?.click() })()`)
await sleep(600)
await shot('v3f-m-library')

await ev(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === '打开 AI 助手'); b?.click() })()`)
await sleep(700)
await ev(`(() => { const el = document.querySelector('textarea[placeholder]'); el.focus(); })()`)
await send('Input.insertText', { text: '我哪些词最薄弱？' })
await sleep(150)
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
await sleep(900)
await shot('v3f-m-assistant')

console.log('done')
ws.close()
