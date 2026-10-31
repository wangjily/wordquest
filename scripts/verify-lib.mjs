import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = 'http://127.0.0.1:4173/'
const OUT = '../shots'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const now = Date.now()

const cards = {}
const mk = (id, dueOffset, stability = 5) => {
  cards[id] = { wordId: id, stability, difficulty: 5, due: now + dueOffset, reps: 3, lapses: 0, state: 'review', lastReview: now - 5 * 86400000, mastered: false }
}
mk('en-cet4-0', -7200000)
mk('en-cet4-1', -3600000)
mk('ja-n5-0', -3600000)
mk('ja-n5-1', -1800000)

const store = {
  state: {
    profile: { name: '旅行者', xp: 300, gems: 6, streak: 2, longestStreak: 5, lastStudyDay: new Date().toISOString().slice(0, 10), petXp: 300, seasonPoints: 300, totalReviews: 20, correctReviews: 17 },
    settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 6, sound: false, targetLang: 'en', activeDecks: ['en-cet4'], onboarded: true },
    cards, logs: [], runs: [], achievements: [],
  },
  version: 0,
}

async function main() {
  const targets = await (await fetch(`${BASE}/json`)).json()
  const page = targets.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  let seq = 0
  const pending = new Map()
  const errs = []
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
    else if (m.method === 'Runtime.exceptionThrown') errs.push(m)
  }
  await new Promise((r) => (ws.onopen = r))
  const send = (method, params = {}) => new Promise((res) => { const i = ++seq; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.value
  const shot = async (name) => {
    const s = await send('Page.captureScreenshot', { format: 'png' })
    fs.mkdirSync(OUT, { recursive: true })
    fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(s.data, 'base64'))
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: SITE })
  await sleep(1200)
  await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)
  await ev('location.hash = "#/library"; true')
  await ev('location.reload(); true')
  await sleep(2600)

  console.log('LIB    :', await ev(`(() => {
    const cards = [...document.querySelectorAll('.card')].slice(0, 4)
    return JSON.stringify(cards.map(c => c.innerText.replace(/\\n/g, ' ')))
  })()`))
  await shot('due-library')

  const clicked = await ev(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => /待复习/.test(x.innerText))
    if (!b) return 'NO_BADGE'
    b.click()
    return b.innerText.replace(/\\n/g, ' ')
  })()`)
  console.log('CLICK  :', clicked)
  await sleep(1600)
  console.log('AFTER  :', await ev(`JSON.stringify({
    hash: location.hash,
    mode: document.body.innerText.includes('复习模式'),
    counter: (document.body.innerText.match(/\\d+ \\/ \\d+/) || ['n/a'])[0],
    h1: (document.querySelector('h1')||{}).innerText,
    decks: JSON.parse(localStorage.getItem('wordquest-v1')).state.settings.activeDecks,
  })`))
  await shot('due-library-learn')
  console.log('ERRORS :', errs.length)
  ws.close()
}
main().catch((e) => { console.error('FAIL', e.message); process.exit(1) })
