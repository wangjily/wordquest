import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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
const shot = async (name) => {
  const s = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(`../shots/${name}.png`, Buffer.from(s.data, 'base64'))
}
const clickText = async (txt) => {
  const r = await ev(
    `(() => { const b=[...document.querySelectorAll('button,a')].find(x=>x.innerText.trim().includes(${JSON.stringify(txt)})); if(b){b.click();return 'ok'} return 'miss' })()`,
  )
  await sleep(700)
  return r
}

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: SITE })
await sleep(1500)
await ev(`localStorage.clear()`)
await ev(`location.reload()`)
await sleep(2200)

await shot('flow-1-onboarding')
console.log('1 onboard:', await ev(`document.querySelector('h1').innerText`))

console.log('lang ja:', await clickText('日语'))
await clickText('标准')
await sleep(300)
await shot('flow-2-onboarding-selected')

console.log('start:', await clickText('开始第一课'))
await sleep(1200)
console.log('2 hash:', await ev('location.hash'))
console.log('3 card :', await ev(`(document.querySelector('h1')||{}).innerText`))
await shot('flow-3-learn')

await ev(`document.querySelector('.card').click()`)
await sleep(600)
console.log('4 reveal:', await ev(`document.body.innerText.includes('例句') || document.body.innerText.includes('Example')`))
await shot('flow-4-learn-back')

const rating = await ev(
  `(() => { const b=[...document.querySelectorAll('button')].filter(x=>/记得|Good/.test(x.innerText)); if(b[0]){b[0].click();return 'ok'} return 'miss' })()`,
)
await sleep(900)
console.log('5 rate :', rating, '| card:', await ev(`(document.querySelector('h1')||{}).innerText`))
console.log('6 store:', await ev(`(() => { const s=JSON.parse(localStorage.getItem('wordquest-v1')); return JSON.stringify({reps: Object.values(s.state.cards).map(c=>c.reps), xp: s.state.profile.xp, pet: s.state.profile.petXp, decks: s.state.settings.activeDecks}) })()`))
await shot('flow-5-after-rate')

ws.close()
