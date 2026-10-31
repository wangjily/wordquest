/** 子目录排障：抓控制台报错 + 页面文本 + 资源失败 */
import fs from 'node:fs'
const BASE = 'http://127.0.0.1:9222'
const SITE = process.argv[2] || 'http://127.0.0.1:4174/words/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const targets = await (await fetch(BASE + '/json')).json()
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
let seq = 0
const pending = new Map()
const logs = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); return }
  if (m.method === 'Runtime.consoleAPICalled') logs.push('[console] ' + m.params.args.map(a => a.value ?? a.description).join(' '))
  if (m.method === 'Runtime.exceptionThrown') logs.push('[throw] ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text))
  if (m.method === 'Log.entryAdded') logs.push(`[log:${m.params.entry.level}] ${m.params.entry.text}`)
  if (m.method === 'Network.loadingFailed') logs.push(`[fail] ${m.params.errorText} ${m.params.type}`)
}
await new Promise((r) => (ws.onopen = r))
const send = (method, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })) })
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r?.exceptionDetails) return 'ERR:' + r.exceptionDetails.text
  return r?.result?.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Log.enable')
await send('Network.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 940, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: SITE + '#/' })
await sleep(6000)

console.log('--- 页面文本 ---')
console.log((await ev('document.body.innerText')).slice(0, 600))
console.log('--- 资源 ---')
console.log(await ev(`performance.getEntriesByType('resource').map(r => r.name.split('/words/')[1] + ' ' + r.responseStatus).slice(0, 20)`))
console.log('--- 按钮 aria ---')
console.log(await ev(`[...document.querySelectorAll('button')].map(b => b.getAttribute('aria-label') || b.innerText.trim()).slice(0, 20)`))
console.log('--- 日志 ---')
console.log(logs.slice(-25).join('\n'))
ws.close()
