import fs from 'node:fs'
const BASE = 'http://127.0.0.1:9222'
const SITE = 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const store = {
  state: {
    profile: { name: '旅行者', xp: 620, gems: 9, streak: 4, longestStreak: 7, lastStudyDay: new Date().toISOString().slice(0, 10), petXp: 620, seasonPoints: 620, totalReviews: 42, correctReviews: 36 },
    settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 10, sound: false, targetLang: 'en', activeDecks: ['en-postgrad-full'], onboarded: true },
    cards: {}, logs: [], runs: [], achievements: [],
  },
  version: 0,
}
const t = await (await fetch(BASE + '/json')).json()
const ws = new WebSocket(t.find((x) => x.type === 'page').webSocketDebuggerUrl)
let seq = 0
const p = new Map()
const errs = []
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && p.has(m.id)) { p.get(m.id)(m.result); p.delete(m.id) } else if (m.method === 'Runtime.exceptionThrown') errs.push(m) }
await new Promise((r) => (ws.onopen = r))
const send = (m, q = {}) => new Promise((res) => { const i = ++seq; p.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: q })) })
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }))?.result?.value
await send('Page.enable'); await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 940, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: SITE }); await sleep(900)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)
await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/games/forge` }); await sleep(1800)
console.log('h1   :', await ev(`document.querySelector('h1')?.innerText`))
await ev(`(() => { const b = [...document.querySelectorAll('button')].find(x => /开始|挑战/.test(x.innerText)); b?.click() })()`)
await sleep(800)
console.log('拼写 :', await ev(`JSON.stringify({ slots: document.querySelectorAll('[data-slot], .slot').length, tiles: document.querySelectorAll('button').length })`))
// 逐题：直接点提示直到过几题，观察是否报错
for (let i = 0; i < 6; i++) {
  await ev(`(() => { const b = [...document.querySelectorAll('button')].find(x => /提示|跳过|下一/.test(x.innerText)); b?.click() })()`)
  await sleep(500)
}
console.log('状态 :', await ev(`document.body.innerText.replace(/\\n+/g,' | ').slice(0, 160)`))
console.log('ERRORS:', errs.length)
ws.close()
