/**
 * 首页「去复习」三态验证：
 *   A 有到期的     → 去复习 · N        → #/learn?mode=due
 *   B 到期清空     → 提前复习 · N      → #/learn?mode=early（队列就是那几个词）
 *   C 一个没学过   → 暂无复习（灰掉、不响应点击）
 * 外加：直接进 due 模式且 0 到期时，空态页要给出「提前复习」的出口。
 */
import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = process.argv[2] || 'http://127.0.0.1:4173/'
const OUT = 'C:/Users/孙续/WorkBuddy/2026-10-27-22-11-41/shots'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const MIN = 60_000
const HOUR = 3_600_000

const card = (id, due) => ({
  wordId: id,
  stability: 2.4,
  difficulty: 4.6,
  due,
  reps: 3,
  lapses: 0,
  state: 'review',
  lastReview: Date.now() - 2 * 24 * HOUR,
  mastered: false,
})

const mkStore = (cards) => ({
  state: {
    profile: {
      name: 'T',
      xp: 1480,
      gems: 42,
      streak: 6,
      longestStreak: 9,
      lastStudyDay: new Date().toISOString().slice(0, 10),
      petXp: 3020,
      seasonPoints: 1480,
      totalReviews: 88,
      correctReviews: 74,
    },
    settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 12, sound: false, targetLang: 'en', activeDecks: ['en-cet4'], onboarded: true },
    cards,
    logs: [],
    runs: [],
    achievements: [],
  },
  version: 2,
})

const targets = await (await fetch(`${BASE}/json`)).json()
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
let seq = 0
const pending = new Map()
const errs = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result)
    pending.delete(m.id)
  } else if (m.method === 'Runtime.exceptionThrown') {
    errs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)
  }
}
await new Promise((r) => (ws.onopen = r))
const send = (m, p = {}) =>
  new Promise((res) => {
    const i = ++seq
    pending.set(i, res)
    ws.send(JSON.stringify({ id: i, method: m, params: p }))
  })
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }))?.result?.value
const shot = async (name) => {
  const s = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(s.data, 'base64'))
}
/** 真鼠标点击：DOM .click() 在部分场景（如 pointer-events:none）不会按用户意图失败 */
const clickAt = async (x, y) => {
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
    await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 })
  }
}
const mouse = async (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 })

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })

const seed = async (store) => {
  await send('Page.navigate', { url: SITE })
  await sleep(700)
  await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)
}
const hash = () => ev('decodeURIComponent(location.hash)')
/** 首屏那颗「复习」胶囊（hero 里 data-off 与否都算） */
const ghost = () => ev(`(() => {
  const el = document.querySelector('.cosmos-inner .cosmos-cta-ghost');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    tag: el.tagName,
    text: el.textContent.trim(),
    off: el.getAttribute('data-off'),
    href: el.getAttribute('href'),
    pe: getComputedStyle(el).pointerEvents,
    x: Math.round(r.left + r.width / 2),
    y: Math.round(r.top + r.height / 2),
  };
})()`)
const learnHead = () => ev(`(() => {
  const t = document.body.innerText;
  return {
    progress: (t.match(/(\\d+)\\s*\\/\\s*(\\d+)/) || [])[0] || null,
    chip: [...document.querySelectorAll('span')].map((s) => s.textContent.trim()).find((s) => s === '复习模式' || s === '提前复习') || null,
    hasEarlyBtn: !![...document.querySelectorAll('a')].find((a) => (a.getAttribute('href') || '').includes('mode=early')),
    lines: t.split('\\n').filter(Boolean).slice(0, 6),
  };
})()`)

const ok = (cond, msg) => console.log(`${cond ? 'OK  ' : 'FAIL'} ${msg}`)

/* ---------- A：7 个到期 ---------- */
const dueCards = {}
for (let i = 0; i < 7; i++) dueCards[`en-cet4-${i}`] = card(`en-cet4-${i}`, Date.now() - (i + 1) * HOUR)
await seed(mkStore(dueCards))
await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/` })
await sleep(2600)
let g = await ghost()
console.log('A) 胶囊:', JSON.stringify(g))
ok(g && g.tag === 'A' && /去复习/.test(g.text) && /·\s*7/.test(g.text), 'A hero 显示「去复习 · 7」')
ok(g && g.href === '#/learn?mode=due', 'A 指向 due 模式')
await shot('review-a-home')
await clickAt(g.x, g.y)
await sleep(900)
let h = await learnHead()
console.log('A) 学习页:', JSON.stringify(h), await hash())
ok((await hash()) === '#/learn?mode=due', 'A 进入 due 模式')
ok(h.progress === '1 / 7', `A 队列长度 7（实际 ${h.progress}）`)
ok(h.chip === '复习模式', 'A 顶部徽标为「复习模式」')
await shot('review-a-learn')

/* ---------- B：到期清空，5 个未到期 ---------- */
const earlyCards = {}
for (let i = 10; i < 15; i++) earlyCards[`en-cet4-${i}`] = card(`en-cet4-${i}`, Date.now() + (i - 9) * HOUR)
await seed(mkStore(earlyCards))
await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/` })
await sleep(2600)
g = await ghost()
console.log('B) 胶囊:', JSON.stringify(g))
ok(g && /提前复习/.test(g.text) && /·\s*5/.test(g.text), 'B hero 显示「提前复习 · 5」')
ok(g && g.href === '#/learn?mode=early', 'B 指向 early 模式')
ok(g && g.off === null, 'B 不再是灰掉的死按钮')
await shot('review-b-home')
await clickAt(g.x, g.y)
await sleep(900)
h = await learnHead()
console.log('B) 学习页:', JSON.stringify(h), await hash())
ok((await hash()) === '#/learn?mode=early', 'B 进入 early 模式')
ok(h.progress === '1 / 5', `B 队列长度 5（实际 ${h.progress}）`)
ok(h.chip === '提前复习', 'B 顶部徽标为「提前复习」')
await shot('review-b-learn')

// B2：直接开 due 模式 → 空态页要有提前复习出口
await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/learn?mode=due` })
await sleep(2400)
h = await learnHead()
console.log('B2) 空态页:', JSON.stringify(h.lines))
ok(/没有到期的单词/.test(h.lines.join('|')), 'B2 提示「现在没有到期的单词」')
ok(h.hasEarlyBtn, 'B2 空态页给出「提前复习」入口')
await shot('review-b2-empty')

// B3：点这个入口，应当就地切到 early 队列（同路由换模式要重开一轮）
const earlyBtn = await ev(`(() => {
  const a = [...document.querySelectorAll('a')].find((x) => (x.getAttribute('href') || '').includes('mode=early'));
  if (!a) return null;
  const r = a.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
})()`)
if (earlyBtn) {
  await clickAt(earlyBtn.x, earlyBtn.y)
  await sleep(1200)
  h = await learnHead()
  console.log('B3) 切到 early:', JSON.stringify(h), await hash())
  ok((await hash()) === '#/learn?mode=early', 'B3 点入口切到 early 模式')
  ok(h.progress === '1 / 5', `B3 队列重开为 5 个（实际 ${h.progress}）`)
  await shot('review-b3-early')
}

/* ---------- C：一个词都没学过 ---------- */
await seed(mkStore({}))
await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/` })
await sleep(2600)
g = await ghost()
console.log('C) 胶囊:', JSON.stringify(g))
ok(g && g.tag === 'SPAN' && /暂无复习/.test(g.text), 'C 显示「暂无复习」而不是可点按钮')
ok(g && g.pe === 'none' && g.off === 'true', 'C 灰掉且不响应点击')
await shot('review-c-home')

/* ---------- D：轨道标签上的复习入口跟着状态走 ---------- */
await seed(mkStore(earlyCards))
await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/` })
await sleep(2600)
const orbit = await ev(`(() => [...document.querySelectorAll('.orbit-item')].map((a) => ({
  text: a.textContent.replace(/\\s+/g, ' ').trim(),
  href: a.getAttribute('href'),
})))()`)
console.log('D) 轨道:', JSON.stringify(orbit))
const rev = (orbit || []).find((o) => /复习/.test(o.text))
ok(!!rev, 'D 轨道里有复习入口')
ok(rev && rev.href === '#/learn?mode=early' && /·\s*5|5/.test(rev.text), `D 轨道复习入口指向 early 且带待办量（${rev?.text}）`)
await shot('review-d-orbit')

console.log('JS 异常:', errs.length ? errs : '无')
ws.close()
