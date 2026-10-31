/** 改版后跑一遍主要路由，确认没有白屏与 JS 异常 */
import fs from 'node:fs'
const BASE = 'http://127.0.0.1:9222'
const SITE = process.argv[2] || 'http://127.0.0.1:4173/'
const OUT = 'C:/Users/孙续/WorkBuddy/2026-10-27-22-11-41/shots'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const now = Date.now()
const cards = {}
const mk = (id, d, reps = 4, lapses = 0, mastered = false) => { cards[id] = { wordId: id, stability: 9, difficulty: 5, due: now + d, reps, lapses, state: 'review', lastReview: now - 86400000, mastered } }
mk('en-cet4-0', -7200000, 5, 2, true); mk('en-cet4-1', -3600000, 4, 1); mk('en-cet4-2', -1800000, 3, 1); mk('en-cet4-3', 86400000, 1, 0)
const store = { state: { profile: { name: '旅行者', xp: 1480, gems: 42, streak: 6, longestStreak: 9, lastStudyDay: new Date().toISOString().slice(0, 10), petXp: 3020, seasonPoints: 1480, totalReviews: 88, correctReviews: 74 }, settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 12, sound: false, targetLang: 'en', activeDecks: ['en-cet4'], onboarded: true }, cards, logs: [], runs: [], achievements: [] }, version: 0 }

const targets = await (await fetch(`${BASE}/json`)).json()
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
let seq = 0
const pending = new Map()
let errs = []
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.text + ' ' + (m.params.exceptionDetails.exception?.description || '')) }
await new Promise((r) => (ws.onopen = r))
const send = (m, p = {}) => new Promise((res) => { const i = ++seq; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })) })
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }))?.result?.value
await send('Page.enable'); await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Page.navigate', { url: SITE }); await sleep(900)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)

const routes = ['/', '/learn', '/library', '/grammar', '/games', '/profile', '/settings', '/games/echo', '/games/forge', '/games/boss', '/games/falling']
for (const r of routes) {
  errs = []
  await send('Page.navigate', { url: `${SITE}#${r}` })
  await sleep(1400)
  const info = await ev(`(() => {
    const t = document.body.innerText.trim();
    return { len: t.length, head: t.slice(0, 40).replace(/\\n/g, ' | '), canvas: !!document.querySelector('canvas') };
  })()`)
  const ok = info && info.len > 20
  console.log(`${ok ? 'OK ' : 'BAD'} ${r.padEnd(14)} len=${String(info?.len).padStart(5)} canvas=${info?.canvas} errs=${errs.length}  ${info?.head}`)
  if (errs.length) console.log('    ' + errs[0].slice(0, 200))
}
ws.close()
