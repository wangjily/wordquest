/** 手机端看三态复习入口：390 宽，提前复习 / 暂无复习 */
import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = 'http://127.0.0.1:4173/'
const OUT = 'C:/Users/孙续/WorkBuddy/2026-10-27-22-11-41/shots'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const HOUR = 3_600_000

const card = (id, due) => ({ wordId: id, stability: 2.4, difficulty: 4.6, due, reps: 3, lapses: 0, state: 'review', lastReview: Date.now() - 2 * 24 * HOUR, mastered: false })
const mk = (cards) => ({
  state: {
    profile: { name: 'T', xp: 1480, gems: 42, streak: 6, longestStreak: 9, lastStudyDay: new Date().toISOString().slice(0, 10), petXp: 3020, seasonPoints: 1480, totalReviews: 88, correctReviews: 74 },
    settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 12, sound: false, targetLang: 'en', activeDecks: ['en-cet4'], onboarded: true },
    cards, logs: [], runs: [], achievements: [],
  },
  version: 2,
})

const targets = await (await fetch(`${BASE}/json`)).json()
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
let seq = 0
const pending = new Map()
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
}
await new Promise((r) => (ws.onopen = r))
const send = (m, p = {}) => new Promise((res) => { const i = ++seq; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })) })
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }))?.result?.value
const shot = async (name) => {
  const s = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(s.data, 'base64'))
}
await send('Page.enable'); await send('Runtime.enable')

for (const [name, cards] of [
  ['m-early', Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`en-cet4-${10 + i}`, card(`en-cet4-${10 + i}`, Date.now() + (i + 1) * HOUR)]))],
  ['m-none', {}],
]) {
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await send('Page.navigate', { url: SITE }); await sleep(600)
  await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(mk(cards)))}); true`)
  await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/` }); await sleep(2600)
  await shot(`review-${name}`)
  const g = await ev(`(() => { const el = document.querySelector('.cosmos-inner .cosmos-cta-ghost'); const r = el.getBoundingClientRect(); return { text: el.textContent.trim(), w: Math.round(r.width), x: Math.round(r.left), y: Math.round(r.top), h: Math.round(r.height), vw: innerWidth }; })()`)
  console.log(name, JSON.stringify(g))
}
ws.close()
