/**
 * 验证朗读改走在线音频：学习页一渲染就该预取当前词的 mp3
 * node scripts/verify-tts-online.mjs [url]
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
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result)
    pending.delete(m.id)
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
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 940, deviceScaleFactor: 1, mobile: false })
await send('Network.setCacheDisabled', { cacheDisabled: true })

await send('Page.navigate', { url: SITE })
await sleep(800)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)

await send('Page.navigate', { url: SITE + '?r=' + Date.now() + '#/learn' })
await sleep(3500)

const word = await ev(`document.querySelector('h1, .text-\\[38px\\]')?.innerText ?? document.body.innerText.split('\\n')[3] ?? ''`)
const audio = await ev(`JSON.stringify(performance.getEntriesByType('resource')
  .filter(r => /youdao|dictvoice/.test(r.name))
  .map(r => ({ url: decodeURIComponent(r.name).replace('https://dict.youdao.com/dictvoice?',''), size: Math.round(r.transferSize/1024), ms: Math.round(r.duration) })))`)
console.log('当前卡:', String(word).slice(0, 40))
console.log('已预取的音频:', audio)

// 点一次喇叭，看会不会再发请求（命中缓存则不发）
const before = await ev(`performance.getEntriesByType('resource').filter(r=>/dictvoice/.test(r.name)).length`)
await ev(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') || x.querySelector('svg')); const btn = [...document.querySelectorAll('button')].filter(x=>x.querySelector('svg.lucide-volume-2'))[0]; btn?.click(); return Boolean(btn) })()`)
await sleep(1200)
const after = await ev(`performance.getEntriesByType('resource').filter(r=>/dictvoice/.test(r.name)).length`)
const playing = await ev(`(() => { const as = [...document.querySelectorAll('audio')]; return as.length + ' audio tags; ' + (window.__lastAudio || '') })()`)
console.log(`点喇叭前请求数 ${before} → 后 ${after}（相等说明走的是已缓存音频）`)
console.log('audio 元素:', playing)

ws.close()
