/** 去侧栏后逐页截图，检查布局是否被拉散 */
import fs from 'node:fs'
const BASE = 'http://127.0.0.1:9222'
const SITE = 'http://127.0.0.1:4173/'
const OUT = 'C:/Users/孙续/WorkBuddy/2026-10-27-22-11-41/shots'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const now = Date.now()
const cards = {}
const mk = (id, d, reps = 4, lapses = 0, mastered = false) => { cards[id] = { wordId: id, stability: 9, difficulty: 5, due: now + d, reps, lapses, state: 'review', lastReview: now - 86400000, mastered } }
mk('en-cet4-0', -7200000, 5, 2, true); mk('en-cet4-1', -3600000, 4, 1); mk('en-cet4-2', -1800000, 3, 1); mk('en-cet4-3', 86400000, 1, 0)
const mkStore = (theme) => ({ state: { profile: { name: '旅行者', xp: 1480, gems: 42, streak: 6, longestStreak: 9, lastStudyDay: new Date().toISOString().slice(0,10), petXp: 3020, seasonPoints: 1480, totalReviews: 88, correctReviews: 74 }, settings: { uiLocale: 'zh', nativeLocale: 'zh', theme, dailyGoal: 12, sound: false, targetLang: 'en', activeDecks: ['en-cet4'], onboarded: true }, cards, logs: [], runs: [], achievements: [] }, version: 0 })
const list = await (await fetch(`${BASE}/json`)).json()
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
let seq = 0; const pending = new Map(); const errs = []
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.text) }
await new Promise((r) => (ws.onopen = r))
const send = (m, p = {}) => new Promise((res) => { const i = ++seq; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })) })
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }))?.result?.value
await send('Page.enable'); await send('Runtime.enable')

const routes = (process.env.ROUTES || '').split(',').filter(Boolean)
const all = routes.length ? routes : ['/learn', '/grammar', '/library', '/games', '/profile', '/settings']
const MOB = process.env.MOB === '1'
await send('Emulation.setDeviceMetricsOverride', MOB ? { width: 390, height: 844, deviceScaleFactor: 2, mobile: true } : { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: SITE }); await sleep(900)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(mkStore('dark')))}); true`)

for (const r of all) {
  await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#${r}` })
  await sleep(1800)
  const s = await send('Page.captureScreenshot', { format: 'png' })
  const name = (MOB ? 'm-page' : 'page') + r.replace(/\//g, '-')
  fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(s.data, 'base64'))
  console.log(name, 'errs', errs.length)
}
ws.close()
