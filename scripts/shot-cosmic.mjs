/**
 * 截图原型页，桌面 + 移动两档。
 * node scripts/shot-cosmic.mjs
 */
import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const FILE = 'file:///C:/Users/%E5%AD%99%E7%BB%AD/WorkBuddy/2026-10-27-22-11-41/wordquest/preview-cosmic.html'
const OUT = 'C:/Users/孙续/WorkBuddy/2026-10-27-22-11-41/shots'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const list = await (await fetch(`${BASE}/json/list`)).json()
let page = list.find((t) => t.type === 'page')
if (!page) {
  const t = await (await fetch(`${BASE}/json/new?about:blank`, { method: 'PUT' })).json()
  page = t
}
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))

let id = 0
const pending = new Map()
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m)
    pending.delete(m.id)
  }
}
const send = (method, params = {}) =>
  new Promise((res) => {
    const i = ++id
    pending.set(i, res)
    ws.send(JSON.stringify({ id: i, method, params }))
  })
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  return r.result?.result?.value
}

await send('Page.enable')
await send('Runtime.enable')

const shots = [
  { name: 'cosmic-mobile', w: 390, h: 844, dsf: 2, mobile: true },
  { name: 'cosmic-desktop', w: 1440, h: 900, dsf: 1, mobile: false },
]

for (const s of shots) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: s.w, height: s.h, deviceScaleFactor: s.dsf, mobile: s.mobile,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: s.mobile, maxTouchPoints: 5 })
  await send('Page.navigate', { url: FILE })
  await sleep(2600)

  // 把指针放到星系中心偏右，制造黑洞吸入效果
  await ev(`(() => {
    const st = document.getElementById('stage');
    const r = st.getBoundingClientRect();
    const wide = r.width >= 720;
    const x = wide ? r.width * 0.66 : r.width * 0.5;
    const y = wide ? r.height * 0.5 : r.height * 0.46;
    st.dispatchEvent(new PointerEvent('pointermove', { clientX: x + 40, clientY: y + 10, bubbles: true, pointerId: 1 }));
    return true;
  })()`)
  await sleep(1200)

  const shot = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(`${OUT}/${s.name}.png`, Buffer.from(shot.result.data, 'base64'))
  console.log(`${s.name}: ${s.w}x${s.h} 写入完成`)
}

const errs = await ev(`(window.__errs || []).length`)
console.log('js errors:', errs)
ws.close()
