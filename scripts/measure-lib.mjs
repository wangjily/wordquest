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
const t = await (await fetch(BASE + '/json')).json()
const ws = new WebSocket(t.find((x) => x.type === 'page').webSocketDebuggerUrl)
let seq = 0
const p = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && p.has(m.id)) { p.get(m.id)(m.result); p.delete(m.id) } }
await new Promise((r) => (ws.onopen = r))
const send = (m, q = {}) => new Promise((res) => { const i = ++seq; p.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: q })) })
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }))?.result?.value
await send('Page.enable'); await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 940, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: SITE }); await sleep(900)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)
await send('Page.navigate', { url: SITE + '?r=' + Date.now() + '#/library' }); await sleep(2000)
console.log(await ev(`JSON.stringify([...document.querySelectorAll('.lib-row')].map(r => { const b = r.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), x: Math.round(b.x), y: Math.round(b.y), t: (r.querySelector('h2') || {}).innerText, pcls: r.parentElement.className.slice(0, 50) } }), null, 1)`))
console.log('列宽:', await ev(`JSON.stringify([...document.querySelectorAll('.lib-row')].slice(0,1).map(r => getComputedStyle(r.parentElement).gridTemplateColumns))`))
import fs from 'node:fs'
const cap = async (name) => { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.mkdirSync('../shots', { recursive: true }); fs.writeFileSync(`../shots/${name}.png`, Buffer.from(s.data, 'base64')) }
await ev(`(() => { const b = [...document.querySelectorAll('.rail-item')].find(x => /自然拼读/.test(x.innerText)); b?.click() })()`)
await sleep(600)
console.log('拼读列宽:', await ev(`JSON.stringify([...document.querySelectorAll('.lib-row')].map(r => Math.round(r.getBoundingClientRect().width)))`))
await cap('pc-phonics-now')
await ev(`(() => { const b = [...document.querySelectorAll('.rail-item')].find(x => /四级/.test(x.innerText)); b?.click() })()`)
await sleep(600)
await cap('pc-cet4-now')
ws.close()
