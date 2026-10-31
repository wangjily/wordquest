import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const W = Number(process.argv[2] || 1440)
const H = Number(process.argv[3] || 900)
const NAME = process.argv[4] || 'falling-play'
const CLICKS = process.argv.slice(5)

const targets = await (await fetch(`${BASE}/json`)).json()
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
const send = (m, p = {}) =>
  new Promise((res) => {
    const i = ++seq
    pending.set(i, res)
    ws.send(JSON.stringify({ id: i, method: m, params: p }))
  })
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true })
  return r?.result?.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 600 })
await send('Page.navigate', { url: SITE })
await sleep(1600)
await ev(`document.querySelector('a[href="#/games"]').click()`)
await sleep(700)
await ev(`document.querySelector('a[href="#/games/falling"]').click()`)
await sleep(1200)

for (const c of CLICKS) {
  if (c.startsWith('text:')) {
    const txt = c.slice(5)
    const r = await ev(
      `(() => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes(${JSON.stringify(txt)})); if (b) { b.click(); return 'ok' } return 'miss' })()`,
    )
    console.log('click', txt, r)
  } else if (c.startsWith('opt:')) {
    const n = Number(c.slice(4))
    const r = await ev(
      `(() => { const bs=[...document.querySelectorAll('button')].slice(-3); const b=bs[${n}]; if(b){b.click();return 'ok:'+b.innerText.replace(/\\n/g,'/')} return 'miss' })()`,
    )
    console.log('opt', n, r)
  } else if (c.startsWith('key:')) {
    const k = c.slice(4)
    const code = k === ' ' ? 'Space' : `Digit${k}`
    const vk = k === ' ' ? 32 : 48 + Number(k)
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: k,
      code,
      windowsVirtualKeyCode: vk,
      nativeVirtualKeyCode: vk,
      text: k === ' ' ? ' ' : k,
    })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
    console.log('key', k)
  } else if (c.startsWith('wait:')) {
    await sleep(Number(c.slice(5)))
    console.log('wait', c.slice(5))
  }
  await sleep(500)
}

await sleep(600)
console.log('hash', await ev('location.hash'))
console.log('body', (await ev(`document.body.innerText.slice(0,200)`))?.replace(/\n/g, ' | '))

const shot = await send('Page.captureScreenshot', { format: 'png' })
fs.mkdirSync('../shots', { recursive: true })
fs.writeFileSync(`../shots/${NAME}.png`, Buffer.from(shot.data, 'base64'))
ws.close()
