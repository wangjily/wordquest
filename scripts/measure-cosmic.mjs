/** 测粒子页帧率与首帧耗时（桌面 / 手机两档） */
const BASE = 'http://127.0.0.1:9222'
const FILE = 'file:///C:/Users/%E5%AD%99%E7%BB%AD/WorkBuddy/2026-10-27-22-11-41/wordquest/preview-cosmic.html'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const list = await (await fetch(`${BASE}/json/list`)).json()
const page = list.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } }
const send = (m, p = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })) })
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.result?.value
await send('Page.enable'); await send('Runtime.enable')

for (const c of [
  { n: 'desktop 1440x900', w: 1440, h: 900, dsf: 1, mobile: false },
  { n: 'mobile 390x844@2x', w: 390, h: 844, dsf: 2, mobile: true },
]) {
  await send('Emulation.setDeviceMetricsOverride', { width: c.w, height: c.h, deviceScaleFactor: c.dsf, mobile: c.mobile })
  await send('Page.navigate', { url: FILE })
  await sleep(1200)
  const r = await ev(`new Promise(res => {
    let frames = 0; const t0 = performance.now();
    function tick(){ frames++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else res({ fps: +(frames / ((performance.now()-t0)/1000)).toFixed(1) }); }
    requestAnimationFrame(tick);
  })`)
  console.log(`${c.n}: ${r.fps} fps`)
}
ws.close()
