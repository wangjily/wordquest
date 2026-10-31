/** 滚动区间截图：桌面整页 + 手机整页 */
import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const FILE = 'file:///C:/Users/%E5%AD%99%E7%BB%AD/WorkBuddy/2026-10-27-22-11-41/wordquest/preview-cosmic.html'
const OUT = 'C:/Users/孙续/WorkBuddy/2026-10-27-22-11-41/shots'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const list = await (await fetch(`${BASE}/json/list`)).json()
const page = list.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
}
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })

await send('Page.enable')
await send('Runtime.enable')

const cases = [
  { name: 'cosmic-below-d', w: 1440, h: 900, dsf: 1, mobile: false },
  { name: 'cosmic-below-m', w: 390, h: 844, dsf: 2, mobile: true },
]
for (const c of cases) {
  await send('Emulation.setDeviceMetricsOverride', { width: c.w, height: c.h, deviceScaleFactor: c.dsf, mobile: c.mobile })
  await send('Page.navigate', { url: FILE })
  await sleep(1800)
  const r = await send('Page.getLayoutMetrics')
  const ch = r.result.cssContentSize.height
  await send('Emulation.setDeviceMetricsOverride', { width: c.w, height: Math.round(ch), deviceScaleFactor: c.dsf, mobile: c.mobile })
  await sleep(700)
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  fs.writeFileSync(`${OUT}/${c.name}.png`, Buffer.from(shot.result.data, 'base64'))
  console.log(`${c.name}: ${c.w}x${Math.round(ch)}`)
}
ws.close()
