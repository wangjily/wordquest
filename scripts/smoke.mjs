import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const targets = await (await fetch(`${BASE}/json`)).json()
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
let seq = 0
const pending = new Map()
const logs = []

ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result)
    pending.delete(m.id)
  } else if (m.method === 'Runtime.exceptionThrown' || m.method === 'Runtime.consoleAPICalled') {
    const p = m.params
    if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + (p.exceptionDetails?.text ?? '') + ' ' + (p.exceptionDetails?.exception?.description ?? ''))
    else if (p.type === 'error') logs.push('ERR ' + p.args.map((a) => a.value ?? a.description).join(' '))
  }
}

await new Promise((r) => (ws.onopen = r))
const send = (m, params = {}) =>
  new Promise((res) => {
    const i = ++seq
    pending.set(i, res)
    ws.send(JSON.stringify({ id: i, method: m, params }))
  })
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true })
  if (r?.exceptionDetails) return 'EVAL_ERR:' + r.exceptionDetails.text
  return r?.result?.value
}
const shot = async (name) => {
  const s = await send('Page.captureScreenshot', { format: 'png' })
  fs.mkdirSync('../shots', { recursive: true })
  fs.writeFileSync(`../shots/${name}.png`, Buffer.from(s.data, 'base64'))
}
const click = async (sel) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'miss'; el.click(); return 'ok' })()`)
const goto = async (hash) => {
  await ev(`location.hash = '#${hash}'; true`)
  await sleep(900)
}
const headline = () => ev(`(document.querySelector('h1')||{innerText:''}).innerText`)

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: SITE })
await sleep(1800)

const before = await ev(`JSON.parse(localStorage.getItem('wordquest-v1')).state.profile.totalReviews`)

/* ---------- Boss ---------- */
await goto('/games/boss')
console.log('boss ready h1:', await headline())
console.log('boss start:', await click('[data-act="start"]'))
await sleep(900)
await shot('boss-play')
const words = []
for (let i = 0; i < 6; i++) {
  words.push((await ev(`document.querySelector('.card')?.innerText.split('\\n')[0] ?? ''`)) || '-')
  await click('[data-opt="0"]')
  await sleep(1100)
}
console.log('boss words:', words.join(' / '))
await shot('boss-play2')
console.log('boss hp text:', await ev(`document.querySelector('header')?.innerText.replace(/\\n/g,' ')`))

/* ---------- Forge ---------- */
await goto('/games/forge')
console.log('forge ready h1:', await headline())
console.log('forge start:', await click('[data-act="start"]'))
await sleep(800)
await shot('forge-play')
const slotCount = await ev(`document.querySelectorAll('[data-slot]').length`)
const tileCount = await ev(`document.querySelectorAll('[data-tile]').length`)
console.log('forge slots/tiles:', slotCount, tileCount)

// 故意拼错两次 → 自动揭示答案 → 进入下一题，跑完整局 8 个词
for (let round = 0; round < 8; round++) {
  for (let pass = 0; pass < 2; pass++) {
    const n = await ev(`document.querySelectorAll('[data-slot]').length`)
    for (let i = 0; i < n; i++) {
      await click(`[data-tile="${i}"]`)
      await sleep(120)
    }
    if (await ev(`!!document.body.innerText.includes('答案是')`)) break
    await sleep(760)
  }
  if (round === 0) await shot('forge-try')
  await sleep(1700)
  const over = await ev(`document.body.innerText.includes('本局结算') || document.body.innerText.includes('再来一局')`)
  console.log('  forge round', round + 1, over ? 'ROUND OVER' : 'next')
  if (over) break
}
await shot('forge-result')

/* ---------- Echo ---------- */
await goto('/games/echo')
console.log('echo ready h1:', await headline())
console.log('echo start:', await click('[data-act="start"]'))
await sleep(1400)
await shot('echo-play')
for (let i = 0; i < 4; i++) {
  await click(`[data-opt="${i % 4}"]`)
  await sleep(1000)
}
await shot('echo-play2')
console.log('echo progress:', await ev(`document.querySelector('header')?.innerText.replace(/\\n/g,' ')`))

const after = await ev(`JSON.parse(localStorage.getItem('wordquest-v1')).state.profile.totalReviews`)
const runs = await ev(`JSON.parse(localStorage.getItem('wordquest-v1')).state.runs.length`)
console.log('SRS totalReviews:', before, '->', after, '| runs stored:', runs)
console.log('ERRORS:', logs.length)
logs.slice(0, 8).forEach((l) => console.log('  ', l.slice(0, 240)))
ws.close()
