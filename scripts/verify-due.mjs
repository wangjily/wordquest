import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = 'http://127.0.0.1:4173/'
const OUT = '../shots'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const now = Date.now()

const cards = {}
const mk = (id, dueOffset, stability = 5, lapses = 0) => {
  cards[id] = {
    wordId: id,
    stability,
    difficulty: 5,
    due: now + dueOffset,
    reps: 3,
    lapses,
    state: 'review',
    lastReview: now - 5 * 86400000,
    mastered: false,
  }
}
// 4 个当前词库（en-cet4）里的词已到期
mk('en-cet4-0', -3 * 86400000, 2) // 逾期 3 天
mk('en-cet4-1', -7200000, 4)
mk('en-cet4-2', -3600000, 6)
mk('en-cet4-3', -600000, 8)
// 未到期
mk('en-cet4-10', 5 * 3600000, 12)
// 另一个词库的到期词，不应计入「待复习」
mk('ja-n5-0', -3600000, 5)
mk('ja-n5-1', -3600000, 5)

const store = {
  state: {
    profile: {
      name: '旅行者', xp: 900, gems: 20, streak: 4, longestStreak: 9,
      lastStudyDay: new Date().toISOString().slice(0, 10),
      petXp: 900, seasonPoints: 900, totalReviews: 60, correctReviews: 50,
    },
    settings: {
      uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 8,
      sound: false, targetLang: 'en', activeDecks: ['en-cet4'], onboarded: true,
    },
    cards,
    logs: Array.from({ length: 12 }, (_, i) => ({
      wordId: `en-cet4-${i}`, rating: 3, source: 'card', elapsed: 3000,
      at: now - i * 7200000, correct: true,
    })),
    runs: [],
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
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
    else if (m.method === 'Runtime.exceptionThrown') events.push(m)
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') events.push(m)
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
  await ev('location.hash = "#/"; true')
  await ev('location.reload(); true')
  await sleep(2600)

  console.log('HOME  :', await ev(`(() => {
    const cards = [...document.querySelectorAll('a')].map(a => a.getAttribute('href'))
    const nums = [...document.querySelectorAll('.card')].slice(0, 4).map(c => c.innerText.replace(/\\n/g, ' '))
    return JSON.stringify({ links: cards.filter(Boolean).slice(0, 6), cards: nums })
  })()`))

  const dueStat = await ev(`(() => {
    const el = [...document.querySelectorAll('a')].find(a => a.getAttribute('href')?.includes('mode=due'))
    if (!el) return 'NO_DUE_LINK'
    return el.innerText.replace(/\\n/g, ' ')
  })()`)
  console.log('DUE_CARD:', dueStat)

  await shot('due-home')

  // 点「待复习」统计卡进入复习模式
  await ev(`(() => { const a = [...document.querySelectorAll('a')].find(x => x.getAttribute('href')?.includes('mode=due')); a.click(); return 1 })()`)
  await sleep(1600)
  console.log('URL    :', await ev('location.hash'))
  console.log('LEARN  :', await ev(`(() => {
    const t = document.body.innerText
    return JSON.stringify({ mode: t.includes('复习模式'), counter: (t.match(/\\d+ \\/ \\d+/) || ['n/a'])[0], h1: (document.querySelector('h1')||{}).innerText })
  })()`))
  await shot('due-learn')

  // 复习一张：翻面 → 点「记得」
  await ev(`document.querySelector('.card')?.click(); 1`)
  await sleep(600)
  await ev(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.trim().startsWith('记得')); if (b) { b.click(); return 1 } return 0 })()`)
  await sleep(900)
  console.log('AFTER  :', await ev(`JSON.stringify({ counter: (document.body.innerText.match(/\\d+ \\/ \\d+/) || ['n/a'])[0], due: JSON.parse(localStorage.getItem('wordquest-v1')).state.cards['en-cet4-0'].due > Date.now() })`))
  await shot('due-after')

  console.log('ERRORS :', events.length)
  ws.close()
}

main().catch((e) => { console.error('FAIL', e.message); process.exit(1) })
