/**
 * 子目录部署验证：/words/ 下能不能正常跑（base: './' 是否真的够用）
 * node scripts/verify-subpath.mjs
 */
import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = process.argv[2] || 'http://127.0.0.1:4180/words/'
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
const shot = async (name) => {
  const s = await send('Page.captureScreenshot', { format: 'png' })
  fs.mkdirSync('../shots', { recursive: true })
  fs.writeFileSync(`../shots/${name}.png`, Buffer.from(s.data, 'base64'))
}

await send('Page.enable')
await send('Runtime.enable')
const errors = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text)
})
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 940, deviceScaleFactor: 1, mobile: false })
await send('Network.setCacheDisabled', { cacheDisabled: true })

await send('Page.navigate', { url: SITE })
await sleep(900)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)

await send('Page.navigate', { url: SITE + '?r=' + Date.now() + '#/' })
await sleep(2500)
console.log('首页:', await ev(`document.body.innerText.split('\\n').filter(Boolean).slice(0, 12).join(' | ')`))
console.log('资源路径:', await ev(`JSON.stringify(performance.getEntriesByType('resource').map(r=>r.name.replace(location.origin,'')).filter(n=>n.includes('assets')||n.includes('corpus')).slice(0,6))`))

// 直接深链刷新（子目录下最容易翻车的地方）
await send('Page.navigate', { url: SITE + '#/library' })
await sleep(2200)
console.log('词库深链:', await ev(`document.querySelector('h1')?.innerText ?? 'none'`))
await shot('subpath-library')

console.log('ERRORS:', errors.length)
errors.slice(0, 5).forEach((e) => console.log('  !', e.slice(0, 160)))
ws.close()
