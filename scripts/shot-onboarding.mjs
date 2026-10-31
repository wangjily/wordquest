import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = 'http://127.0.0.1:4173/'
const W = Number(process.argv[2] || 390)
const H = Number(process.argv[3] || 844)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 600 })
await send('Page.navigate', { url: SITE })
await sleep(1000)
await ev('localStorage.removeItem("wordquest-v1"); true')
await ev('location.hash = "#/"; true')
await ev('location.reload(); true')
await sleep(2500)

console.log('STEP1 :', await ev(`document.body.innerText.replace(/\\n/g, ' | ').slice(0, 220)`))
await shot('onboard-1')

// 选「四级」再继续
await ev(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.trim() === '四级'); b?.click(); return !!b })()`)
await sleep(500)
await shot('onboard-1b')
await ev(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('继续')); b?.click(); return !!b })()`)
await sleep(900)
console.log('STEP2 :', await ev(`document.body.innerText.replace(/\\n/g, ' | ').slice(0, 260)`))
await shot('onboard-2')

// 开始第一课 → 应进入学习页
await ev(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('开始第一课')); b?.click(); return !!b })()`)
await sleep(1600)
console.log('LEARN :', await ev(`JSON.stringify({ hash: location.hash, h1: (document.querySelector('h1')||{}).innerText, decks: JSON.parse(localStorage.getItem('wordquest-v1')).state.settings.activeDecks })`))
await shot('onboard-learn')
console.log('ERRORS:', errs.length)
ws.close()
