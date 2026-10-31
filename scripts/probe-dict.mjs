const BASE = 'http://127.0.0.1:9222'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const t = await (await fetch(BASE + '/json')).json()
const ws = new WebSocket(t.find((x) => x.type === 'page').webSocketDebuggerUrl)
let seq = 0
const p = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && p.has(m.id)) { p.get(m.id)(m.result); p.delete(m.id) } }
await new Promise((r) => (ws.onopen = r))
const send = (m, q = {}) => new Promise((res) => { const i = ++seq; p.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: q })) })
const ev = async (x) => {
  const r = await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })
  if (r?.exceptionDetails) return 'EXC: ' + (r.exceptionDetails.exception?.description || '').slice(0, 200)
  return r?.result?.value
}
await send('Runtime.enable')
await send('Page.navigate', { url: 'http://127.0.0.1:4173/' })
await sleep(1200)

const urls = [
  'https://raw.githubusercontent.com/Kaiyiwing/qwerty-learner/master/public/dicts/CET4_T.json',
  'https://raw.githubusercontent.com/Kaiyiwing/qwerty-learner/master/public/dicts/CET6_T.json',
  'https://raw.githubusercontent.com/Kaiyiwing/qwerty-learner/master/public/dicts/KaoYan_T.json',
]
for (const u of urls) {
  const r = await ev(`fetch(${JSON.stringify(u)}).then(r => r.text()).then(t => t.length + '|' + t.slice(0, 80)).catch(e => 'ERR ' + e.message)`)
  console.log(u.split('/').pop(), '→', String(r).slice(0, 130))
}
ws.close()
