/**
 * 断网 / 缺分片的兜底：某本词书 404 时，App 不能永远停在「正在装载」。
 * node scripts/verify-boot-fail.mjs
 */
import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const store = {
  state: {
    profile: { name: '旅行者', xp: 620, gems: 9, streak: 4, longestStreak: 7, lastStudyDay: new Date().toISOString().slice(0, 10), petXp: 620, seasonPoints: 620, totalReviews: 42, correctReviews: 36 },
    settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 10, sound: false, targetLang: 'en', activeDecks: ['en-cet4'], onboarded: true },
    cards: {}, logs: [], runs: [], achievements: [],
  },
  version: 0,
}

const targets = await (await fetch(BASE + '/json')).json()
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
let seq = 0
const pending = new Map()
const send = (method, params = {}) =>
  new Promise((res) => {
    const id = ++seq
    pending.set(id, res)
    ws.send(JSON.stringify({ id, method, params }))
  })
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result)
    pending.delete(m.id)
    return
  }
  // 把 en-cet4 的分片打成 404，其余放行
  if (m.method === 'Fetch.requestPaused') {
    const { requestId, request } = m.params
    if (request.url.includes('/corpus/en-cet4.json')) {
      void send('Fetch.fulfillRequest', {
        requestId,
        responseCode: 404,
        responseHeaders: [{ name: 'Content-Type', value: 'text/plain' }],
        body: Buffer.from('nope').toString('base64'),
      })
    } else {
      void send('Fetch.continueRequest', { requestId })
    }
  }
}
await new Promise((r) => (ws.onopen = r))
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r?.exceptionDetails) return `ERR:${r.exceptionDetails.text}`
  return r?.result?.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Network.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 940, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: SITE })
await sleep(800)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)

await send('Fetch.enable', { patterns: [{ urlPattern: '*/corpus/*' }] })
await send('Page.navigate', { url: SITE + '?r=' + Date.now() + '#/' })
await sleep(3000)

const txt = await ev(`document.body.innerText.replace(/\\n/g, ' | ').slice(0, 180)`)
const stuck = await ev(`document.body.innerText.includes('正在装载') || document.body.innerText.includes('正在打开词库')`)
console.log('3 秒后是否还卡在启动画面:', stuck)
console.log('页面内容:', txt)

const s = await send('Page.captureScreenshot', { format: 'png' })
fs.mkdirSync('../shots', { recursive: true })
fs.writeFileSync('../shots/boot-fail.png', Buffer.from(s.data, 'base64'))

await send('Fetch.disable')
console.log(stuck ? '\n❌ 仍然卡死' : '\n✓ 正常进入主界面')
ws.close()
