/**
 * 首次访问（全新浏览器）验证：不再出现引导页，直接进首页
 * node scripts/verify-newuser.mjs [url]
 */
import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = process.argv[2] || 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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
const errors = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text)
})
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 940, deviceScaleFactor: 1, mobile: false })
await send('Network.setCacheDisabled', { cacheDisabled: true })

// 全新访客：没有 wordquest-v1
await send('Page.navigate', { url: SITE })
await sleep(700)
await ev(`localStorage.clear(); true`)

await send('Page.navigate', { url: SITE + '?r=' + Date.now() + '#/' })
await sleep(3000)

const body = await ev(`document.body.innerText.replace(/\\n+/g, ' | ').slice(0, 260)`)
const hasOnboard = await ev(`document.body.innerText.includes('选择你的学习阶段') || document.body.innerText.includes('把每天背单词')`)
const settings = await ev(`(() => { try { const s = JSON.parse(localStorage.getItem('wordquest-v1')); return JSON.stringify({ onboarded: s.state.settings.onboarded, decks: s.state.settings.activeDecks, goal: s.state.settings.dailyGoal }) } catch(e) { return 'none' } })()`)

console.log('是否还在引导页:', hasOnboard)
console.log('落库设置:', settings)
console.log('页面内容:', body)
await shot('newuser-home')

// TTS 环境探测
const tts = await ev(`(() => {
  const ss = window.speechSynthesis;
  if (!ss) return 'no-speechSynthesis';
  const vs = ss.getVoices();
  return JSON.stringify({ count: vs.length, sample: vs.slice(0,4).map(v => v.name + '/' + v.lang + (v.localService ? '/local' : '/remote')) });
})()`)
console.log('TTS:', tts)

console.log('ERRORS:', errors.length)
errors.slice(0, 4).forEach((e) => console.log('  !', e.slice(0, 150)))
ws.close()
