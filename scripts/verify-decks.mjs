import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const now = Date.now()

const cards = {}
const mk = (id, dueOffset, reps = 4, mastered = false) => {
  cards[id] = {
    wordId: id,
    stability: 8,
    difficulty: 5,
    due: now + dueOffset,
    reps,
    lapses: 1,
    state: 'review',
    lastReview: now - 4 * 86400000,
    mastered,
  }
}
mk('en-cet4-0', -7200000, 5, true)
mk('en-cet4-1', -3600000, 3, true)
mk('en-cet4-2', -1000)

const store = {
  state: {
    profile: {
      name: '旅行者', xp: 620, gems: 9, streak: 4, longestStreak: 7,
      lastStudyDay: new Date().toISOString().slice(0, 10),
      petXp: 620, seasonPoints: 620, totalReviews: 42, correctReviews: 36,
    },
    settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 10, sound: false, targetLang: 'en', activeDecks: ['en-cet4'], onboarded: true },
    cards, logs: [], runs: [], achievements: [],
  },
  version: 0,
}

const targets = await (await fetch(`${BASE}/json`)).json()
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
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
  fs.mkdirSync('../shots', { recursive: true })
  fs.writeFileSync(`../shots/${name}.png`, Buffer.from(s.data, 'base64'))
}

async function seed(width, height, mobile) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
  await send('Page.navigate', { url: SITE })
  await sleep(900)
  await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)
  await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/library` })
  await sleep(2000)
}

await send('Page.enable')
await send('Runtime.enable')

// ---------- PC ----------
await seed(1440, 940, false)

const rails = await ev(`JSON.stringify([...document.querySelectorAll('.rail-item')].map(x => x.innerText.replace(/\\n/g,' ')))`)
console.log('PC 学段  :', rails)

const stageWalk = async () => {
  const n = await ev(`document.querySelectorAll('.rail-item').length`)
  const out = []
  for (let i = 0; i < n; i++) {
    const name = await ev(`document.querySelectorAll('.rail-item')[${i}].innerText.split('\\n')[0]`)
    await ev(`document.querySelectorAll('.rail-item')[${i}].click()`)
    await sleep(380)
    const list = await ev(`JSON.stringify([...document.querySelectorAll('.lib-row')].map(r => r.querySelector('h2')?.innerText).filter(Boolean))`)
    const cnt = await ev(`document.querySelectorAll('.lib-row h2').length`)
    out.push(`${name} → ${cnt} 本 ${list}`)
  }
  await ev(`document.querySelectorAll('.rail-item')[0].click()`)
  await sleep(300)
  return out
}
for (const line of await stageWalk()) console.log('  ', line)

// 空分类检查：其他里只有日语/西语
await ev(`(() => { const b=[...document.querySelectorAll('.rail-item')].find(x=>/其他/.test(x.innerText)); b?.click(); return !!b })()`)
await sleep(500)
console.log('其他     :', await ev(`JSON.stringify([...document.querySelectorAll('.lib-row')].map(r => r.querySelector('h2')?.innerText).filter(Boolean))`))
await shot('decks-other')

// 自然拼读详情
await ev(`(() => { const b=[...document.querySelectorAll('.rail-item')].find(x=>/自然拼读/.test(x.innerText)); b?.click(); return !!b })()`)
await sleep(600)
await ev(`document.querySelectorAll('.lib-row')[0]?.click()`)
await sleep(500)
console.log('拼读详情 :', await ev(`[...document.querySelectorAll('aside')].pop()?.innerText.replace(/\\n/g,' | ')`))
await shot('decks-phonics')

// 英专
await ev(`(() => { const b=[...document.querySelectorAll('.rail-item')].find(x=>/英专/.test(x.innerText)); b?.click(); return !!b })()`)
await sleep(600)
console.log('英专     :', await ev(`JSON.stringify([...document.querySelectorAll('.lib-row')].map(r => r.querySelector('h2')?.innerText).filter(Boolean))`))
await shot('decks-major')

// 留学
await ev(`(() => { const b=[...document.querySelectorAll('.rail-item')].find(x=>/留学/.test(x.innerText)); b?.click(); return !!b })()`)
await sleep(600)
console.log('留学     :', await ev(`JSON.stringify([...document.querySelectorAll('.lib-row')].map(r => r.querySelector('h2')?.innerText).filter(Boolean))`))
await shot('decks-abroad')

// ---------- 移动 ----------
await seed(390, 844, true)
console.log('M 胶囊   :', await ev(`JSON.stringify([...document.querySelectorAll('.chip-btn')].map(x => x.innerText).slice(0, 12))`))
console.log('M 列表   :', await ev(`JSON.stringify([...document.querySelectorAll('.lib-row')].map(r => r.querySelector('h2')?.innerText).filter(Boolean))`))
await shot('decks-m')
await ev(`(() => { const b=[...document.querySelectorAll('.chip-btn')].find(x=>/英专/.test(x.innerText)); b?.click(); return !!b })()`)
await sleep(500)
console.log('M 英专   :', await ev(`JSON.stringify([...document.querySelectorAll('.lib-row')].map(r => r.querySelector('h2')?.innerText).filter(Boolean))`))
await shot('decks-m-major')

// ---------- 首页词书联动 ----------
await seed(1440, 940, false)
await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/` })
await sleep(1800)
console.log('首页待复习:', await ev(`document.body.innerText.match(/待复习[^\\n]*/)?.[0]`))
await shot('decks-home')

console.log('ERRORS   :', errs.length)
ws.close()
