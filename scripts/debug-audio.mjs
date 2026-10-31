/**
 * 排查音频链路：到底是按钮没点到、接口拉不到，还是 play() 被拒。
 * node scripts/debug-audio.mjs [url]
 */
const CDP = 'http://127.0.0.1:9222'
const SITE = process.argv[2] || 'http://127.0.0.1:4176/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const targets = await (await fetch(CDP + '/json')).json()
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((res) => (ws.onopen = res))

let id = 0
const pending = new Map()
const net = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    const { res } = pending.get(m.id)
    pending.delete(m.id)
    res(m.result)
    return
  }
  if (m.method === 'Network.responseReceived') {
    const u = m.params.response.url
    if (/youdao|baidu/.test(u)) net.push(`${m.params.response.status} ${u.slice(0, 70)}`)
  }
  if (m.method === 'Network.loadingFailed') {
    net.push(`FAILED ${m.params.errorText}`)
  }
}
const send = (method, params = {}) =>
  new Promise((res) => {
    const mid = ++id
    pending.set(mid, { res })
    ws.send(JSON.stringify({ id: mid, method, params }))
  })
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  return r.result?.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Network.enable')
await send('Network.setUserAgentOverride', {
  userAgent:
    'Mozilla/5.0 (Linux; Android 13; Pixel 6 Build/TQ3A.230805.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36',
})
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2.75, mobile: true })
await send('Page.navigate', { url: SITE + '#/learn' })
await sleep(2500)

console.log('=== 页面上的按钮 ===')
const labels = await ev(`[...document.querySelectorAll('button')].map(b => b.getAttribute('aria-label')).filter(Boolean)`)
console.log(labels)

console.log('\n=== 直接 fetch 音频接口 ===')
const probe = await ev(`(async () => {
  const out = {}
  for (const [name, url] of [
    ['youdao', 'https://dict.youdao.com/dictvoice?audio=calculate&type=2'],
    ['baidu', 'https://fanyi.baidu.com/gettts?lan=en&text=Calculate%20the%20total%20cost%20first.&spd=3&source=web'],
  ]) {
    try {
      const r = await fetch(url)
      const b = await r.blob()
      out[name] = { status: r.status, type: r.headers.get('content-type'), bytes: b.size }
    } catch (e) { out[name] = { error: String(e) } }
  }
  return out
})()`)
console.log(JSON.stringify(probe, null, 2))

console.log('\n=== 点朗读按钮 ===')
const clicked = await ev(`(() => {
  const b = [...document.querySelectorAll('button')].find(x => /朗读|发音|speak/i.test(x.getAttribute('aria-label') || ''))
  if (!b) return 'not-found'
  b.click()
  return b.getAttribute('aria-label')
})()`)
console.log('点击:', clicked)
await sleep(2200)

const st = await ev(`(() => {
  const list = [...document.querySelectorAll('audio')]
  return list.map(a => ({
    src: (a.currentSrc || a.src || '').replace('https://', '').slice(0, 50),
    paused: a.paused,
    t: Number(a.currentTime.toFixed(2)),
    ready: a.readyState,
    err: a.error ? a.error.code : null,
    rate: a.playbackRate,
  }))
})()`)
console.log('音频元素:', JSON.stringify(st, null, 2))

console.log('\n=== 音频相关网络 ===')
console.log(net.length ? net.join('\n') : '(没有任何请求)')

ws.close()
