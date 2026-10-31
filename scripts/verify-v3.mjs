/**
 * v3 验证：全量语料 + 全局搜索 + AI 助手
 */
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
await send('Log.enable')
const errors = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(m.params.entry.text)
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text)
})

await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 940, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: SITE })
await sleep(700)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)

// ---- 首页 ----
await send('Page.navigate', { url: SITE + '?r=' + Date.now() + '#/' })
await sleep(2600)
console.log('--- 首页 ---')
console.log(await ev(`document.body.innerText.split('\\n').filter(Boolean).slice(0, 14).join(' | ')`))
console.log('词数统计:', await ev(`document.body.innerText.match(/\\d[\\d,]*\\s*词/g)?.slice(0,6).join(', ') ?? 'none'`))
await shot('v3-home')

// ---- 词库 ----
await send('Page.navigate', { url: SITE + '?r=' + Date.now() + '#/library' })
await sleep(2200)
console.log('\n--- 词库 ---')
console.log('学段:', await ev(`JSON.stringify([...document.querySelectorAll('.rail-item')].map(x => x.innerText.replace(/\\n/g,' ')))`))
console.log('书架头:', await ev(`document.querySelector('h1')?.innerText + ' / ' + document.body.innerText.match(/\\d+ 本词书/)?.[0]`))
await shot('v3-library')

// 逐个学段点开看词数
const stages = await ev(`JSON.stringify([...document.querySelectorAll('.rail-item')].map(x => x.innerText.split('\\n')[0]))`)
for (const s of JSON.parse(stages)) {
  await ev(`(() => { const b = [...document.querySelectorAll('.rail-item')].find(x => x.innerText.includes(${JSON.stringify(s)})); b?.click() })()`)
  await sleep(320)
  const rows = await ev(`JSON.stringify([...document.querySelectorAll('.lib-row h2')].map((h,i) => h.innerText))`)
  const counts = await ev(`JSON.stringify([...document.querySelectorAll('.lib-row')].filter(r=>r.querySelector('h2')).map(r => (r.innerText.match(/(\\d[\\d,]*)\\s*词/)||[])[1]).filter(Boolean))`)
  console.log(`  ${s.padEnd(6)} ${JSON.parse(rows).length} 本  ${JSON.parse(counts).join(' / ')}`)
}

// ---- 全局搜索 ----
console.log('\n--- 搜索 ---')
await send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 2, key: 'k', code: 'KeyK', windowsVirtualKeyCode: 75 })
await send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 2, key: 'k', code: 'KeyK', windowsVirtualKeyCode: 75 })
await sleep(500)
console.log('面板打开:', await ev(`Boolean(document.querySelector('input[placeholder*="输入英文"]'))`))
const setInput = async (v) => {
  await ev(`(() => {
    const el = document.querySelector('input[placeholder*="输入英文"]');
    if (!el) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, ${JSON.stringify(v)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`)
}
for (const q of ['aban', '放弃', 'kənˈsɪdə', '日安']) {
  await setInput(q)
  await sleep(450)
  const top = await ev(`JSON.stringify([...document.querySelectorAll('[data-idx]')].slice(0,3).map(b => b.innerText.replace(/\\n/g,' ')))`)
  console.log(`  「${q}」→ ${top}`)
  await shot(`v3-search-${q.length}`)
}
await setInput('abandon')
await sleep(400)
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
await sleep(420)
console.log('详情:', await ev(`(() => { const el = [...document.querySelectorAll('button')].find(b => b.innerText.includes('问 AI 助手')); return el ? document.body.innerText.split('\\n').filter(Boolean).slice(0,12).join(' | ') : 'not-open' })()`))
await shot('v3-search-detail')
for (let i = 0; i < 3; i++) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await sleep(220)
}
console.log('面板已关:', await ev(`!document.querySelector('input[placeholder*="输入英文"]')`))

// ---- AI 助手 ----
console.log('\n--- AI 助手 ---')
await ev(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === '打开 AI 助手'); b?.click() })()`)
await sleep(600)
console.log('面板:', await ev(`document.body.innerText.includes('词跃助手')`))
for (const q of ['今天该学什么', '解释一下 abandon', '考我 5 个词']) {
  await ev(`(() => { const el = document.querySelector('textarea[placeholder]'); el.focus(); el.value=''; })()`)
  await send('Input.insertText', { text: q })
  await sleep(200)
  await ev(`(() => { const btn = [...document.querySelectorAll('button')].find(b => b.querySelector('svg') && b.className.includes('from-[var(--brand)]')); })()`)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  await sleep(900)
  const reply = await ev(`(() => { const nodes = [...document.querySelectorAll('div')].filter(d => d.className.includes('rounded-bl-md')); return nodes.length ? nodes[nodes.length-1].innerText.replace(/\\n/g,' | ').slice(0,150) : 'none' })()`)
  console.log(`  「${q}」→ ${reply}`)
}
await shot('v3-assistant')

// ---- 学习页 ----
console.log('\n--- 学习 ---')
await send('Page.navigate', { url: SITE + '?r=' + Date.now() + '#/learn' })
await sleep(2400)
console.log('卡片:', await ev(`document.body.innerText.split('\\n').filter(Boolean).slice(0,8).join(' | ')`))
await shot('v3-learn')

// ---- 移动端 ----
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
await send('Page.navigate', { url: SITE + '?r=' + Date.now() + '#/' })
await sleep(2600)
await shot('v3-m-home')
await send('Page.navigate', { url: SITE + '?r=' + Date.now() + '#/library' })
await sleep(2000)
await shot('v3-m-library')
await ev(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === '打开 AI 助手'); b?.click() })()`)
await sleep(700)
await shot('v3-m-assistant')

console.log('\nERRORS:', errors.length)
errors.slice(0, 6).forEach((e) => console.log('  !', e.slice(0, 160)))
ws.close()
