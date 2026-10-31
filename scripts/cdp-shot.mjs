import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = 'http://127.0.0.1:4173/'
const OUT = process.argv[2] || 'shots'
const ROUTE = process.argv[3] || '/'
const NAME = process.argv[4] || 'shot'
const WIDTH = Number(process.argv[5] || 1440)
const HEIGHT = Number(process.argv[6] || 900)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const now = Date.now()
const past = now - 3 * 86400000

const cards = {}
const mk = (id, reps = 3, lapses = 0, dueOffset = -3600000, stability = 5) => {
  cards[id] = {
    wordId: id,
    stability,
    difficulty: 5,
    due: now + dueOffset,
    reps,
    lapses,
    state: 'review',
    lastReview: past,
    mastered: stability >= 21,
  }
}
mk('en-cet4-0', 4, 1, -7200000, 4)
mk('en-cet4-1', 3, 0, -3600000, 6)
mk('en-cet4-2', 5, 2, -1800000, 2)
mk('en-cet4-5', 6, 0, -900000, 24)
mk('en-cet4-8', 2, 1, -600000, 1.5)
mk('ja-n5-0', 3, 0, -3600000, 5)

const store = {
  state: {
    profile: {
      name: '旅行者',
      xp: 1480,
      gems: 42,
      streak: 6,
      longestStreak: 9,
      lastStudyDay: new Date().toISOString().slice(0, 10),
      petXp: 1620,
      seasonPoints: 1480,
      totalReviews: 168,
      correctReviews: 141,
    },
    settings: {
      uiLocale: 'zh',
      nativeLocale: 'zh',
      theme: 'dark',
      dailyGoal: 12,
      sound: false,
      targetLang: 'en',
      activeDecks: ['en-cet4', 'ja-n5'],
      onboarded: true,
    },
    cards,
    logs: Array.from({ length: 40 }, (_, i) => ({
      wordId: `en-cet4-${i % 20}`,
      rating: i % 7 === 0 ? 1 : 3,
      source: 'card',
      elapsed: 4000,
      at: now - i * 3600000 * 6,
      correct: i % 7 !== 0,
    })),
    runs: [
      { id: 'r1', game: 'falling', score: 860, accuracy: 0.86, comboMax: 12, total: 22, correct: 19, duration: 60, at: now - 86400000 },
      { id: 'r2', game: 'falling', score: 640, accuracy: 0.74, comboMax: 8, total: 19, correct: 14, duration: 60, at: now - 2 * 86400000 },
    ],
    achievements: [],
  },
  version: 0,
}

async function main() {
  const targets = await (await fetch(`${BASE}/json`)).json()
  const page = targets.find((t) => t.type === 'page')
  if (!page) throw new Error('no page target')

  const ws = new WebSocket(page.webSocketDebuggerUrl)
  let seq = 0
  const pending = new Map()
  const events = []

  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m.result)
      pending.delete(m.id)
    } else if (m.method === 'Runtime.consoleAPICalled' || m.method === 'Runtime.exceptionThrown') {
      events.push(m)
    }
  }
  await new Promise((r) => (ws.onopen = r))

  const send = (method, params = {}) =>
    new Promise((res) => {
      const i = ++seq
      pending.set(i, res)
      ws.send(JSON.stringify({ id: i, method, params }))
    })

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: WIDTH < 600,
  })

  await send('Page.navigate', { url: SITE })
  await sleep(900)
  await send('Runtime.evaluate', {
    expression: `localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); location.hash = '#/'; true`,
  })
  // 每次都用种子数据重载，避免沿用上一轮留下的内存态
  await send('Runtime.evaluate', { expression: 'location.reload(); true' })
  await sleep(2600)
  if (ROUTE !== '/') {
    const chain = ROUTE.startsWith('/games/') ? ['/games', ROUTE] : [ROUTE]
    for (const step of chain) {
      const r = await send('Runtime.evaluate', {
        expression: `(() => { const a = document.querySelector('a[href="#${step}"]'); if (a) { a.click(); return 'click:' + a.getAttribute('href') } location.hash = '#${step}'; return 'hash' })()`,
        returnByValue: true,
      })
      await sleep(1400)
      console.log('  step', step, r?.result?.value)
    }
  }
  await sleep(900)

  const info = await send('Runtime.evaluate', {
    expression: `JSON.stringify({ text: (document.querySelector('#root')||{}).innerText ? document.querySelector('#root').innerText.slice(0,300) : 'EMPTY', height: document.body.scrollHeight, bg: getComputedStyle(document.body).backgroundColor, href: location.href, h1: (document.querySelector('h1')||{}).innerText })`,
    returnByValue: true,
  })

  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(`${OUT}/${NAME}.png`, Buffer.from(shot.data, 'base64'))

  console.log('PAGE:', info?.result?.value)
  console.log('ERRORS:', events.length)
  for (const e of events.slice(0, 6)) {
    console.log('  ', JSON.stringify(e.params).slice(0, 300))
  }
  ws.close()
}

main().catch((e) => {
  console.error('FAIL', e.message)
  process.exit(1)
})
