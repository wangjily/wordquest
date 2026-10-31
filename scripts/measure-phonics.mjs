import fs from 'node:fs'
const BASE = 'http://127.0.0.1:9222'
const SITE = 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const store = { state: { profile: { name: '旅行者', xp: 620, gems: 9, streak: 4, longestStreak: 7, lastStudyDay: new Date().toISOString().slice(0, 10), petXp: 620, seasonPoints: 620, totalReviews: 42, correctReviews: 36 }, settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 10, sound: false, targetLang: 'en', activeDecks: ['en-cet4'], onboarded: true }, cards: {}, logs: [], runs: [], achievements: [] }, version: 0 }
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
await ev(`(() => { const b = [...document.querySelectorAll('.rail-item')].find(x => /自然拼读/.test(x.innerText)); b?.click() })()`)
await sleep(700)
console.log('viewport :', await ev(`innerWidth + 'x' + innerHeight + ' dpr=' + devicePixelRatio`))
console.log('gridCols :', await ev(`getComputedStyle(document.querySelectorAll('.lib-row')[0].parentElement).gridTemplateColumns`))
console.log(await ev(`JSON.stringify([...document.querySelectorAll('.lib-row')].map(r => { const b = r.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height), (r.querySelector('h2')||{}).innerText, r.parentElement.className.includes('grid-cols-3') ? 'rec' : 'book'] }))`))
const s = await send('Page.captureScreenshot', { format: 'png' })
fs.writeFileSync('../shots/pc-phonics-check.png', Buffer.from(s.data, 'base64'))
console.log('png bytes:', Math.round(s.data.length / 1024) + 'KB')
ws.close()
