/** 滚到下方内容区截图 */
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
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } }
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.result?.value
await send('Page.enable'); await send('Runtime.enable')

for (const c of [
  { name: 'cosmic-scroll-d', w: 1440, h: 900, dsf: 1, mobile: false },
  { name: 'cosmic-scroll-m', w: 390, h: 844, dsf: 2, mobile: true },
]) {
  await send('Emulation.setDeviceMetricsOverride', { width: c.w, height: c.h, deviceScaleFactor: c.dsf, mobile: c.mobile })
  await send('Page.navigate', { url: FILE })
  await sleep(1500)
  await ev(`window.scrollTo(0, ${c.h - 40})`)
  await sleep(700)
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(`${OUT}/${c.name}.png`, Buffer.from(shot.result.data, 'base64'))
  console.log(c.name)
}
ws.close()
