/**
 * 验证朗读请求不再携带 Referer（百度会拒绝外站 Referer，返回 0 字节）
 * node scripts/verify-referrer.mjs [url]
 */
const BASE = 'http://127.0.0.1:9222'
const SITE = process.argv[2] || 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const store = {
  state: {
    profile: { name: '旅行者', xp: 620, gems: 9, streak: 4, longestStreak: 7, lastStudyDay: new Date().toISOString().slice(0, 10), petXp: 620, seasonPoints: 620, totalReviews: 42, correctReviews: 36 },
    settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 10, sound: true, targetLang: 'en', activeDecks: ['en-cet4'], onboarded: true },
    cards: {}, logs: [], runs: [], achievements: [],
  },
  version: 0,
}

const targets = await (await fetch(BASE + '/json')).json()
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
let seq = 0
const pending = new Map()
const media = new Map() // requestId -> {url, referer}
const finished = new Map() // requestId -> bytes

ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result)
    pending.delete(m.id)
    return
  }
  if (m.method === 'Network.requestWillBeSent') {
    const { requestId, request } = m.params
    if (/dictvoice|gettts/.test(request.url)) {
      const h = request.headers || {}
      media.set(requestId, {
        url: decodeURIComponent(request.url).replace(/^https:\/\/(dict\.youdao\.com\/dictvoice|fanyi\.baidu\.com\/gettts)\?/, ''),
        referer: h.Referer || h.referer || '(无)',
      })
    }
  }
  if (m.method === 'Network.loadingFinished') {
    const hit = media.get(m.params.requestId)
    if (hit) finished.set(m.params.requestId, m.params.encodedDataLength)
  }
  if (m.method === 'Network.loadingFailed') {
    const hit = media.get(m.params.requestId)
    if (hit) hit.failed = m.params.errorText
  }
}

await new Promise((r) => (ws.onopen = r))
const send = (method, params = {}) =>
  new Promise((res) => {
    const id = ++seq
    pending.set(id, res)
    ws.send(JSON.stringify({ id, method, params }))
  })
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r?.exceptionDetails) return `ERR:${r.exceptionDetails.text}`
  return r?.result?.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Network.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Network.setCacheDisabled', { cacheDisabled: true })
await send('Page.navigate', { url: SITE })
await sleep(800)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)

await send('Page.navigate', { url: SITE + '?r=' + Date.now() + '#/learn' })
await sleep(4000)

console.log('文档里的 referrer 策略:', await ev(`document.querySelector('meta[name=referrer]')?.content ?? '(没有)'`))
console.log('\n朗读请求：')
for (const [id, info] of media) {
  const bytes = finished.get(id)
  console.log(`  ${info.url.slice(0, 46).padEnd(48)} Referer=${String(info.referer).padEnd(22)} ${bytes != null ? Math.round(bytes / 1024) + 'KB' : info.failed ? 'FAILED:' + info.failed : '?'}`)
}
if (!media.size) console.log('  （没有发出朗读请求）')

ws.close()
