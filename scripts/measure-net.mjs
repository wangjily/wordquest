/**
 * 网速模拟下的首屏耗时：4G / Fast 3G / Slow 3G，各跑一遍，顺便截一张启动画面。
 * node scripts/measure-net.mjs [decks]
 */
import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const activeDecks = (process.argv[2] || 'en-cet4').split(',').filter(Boolean)
const theme = process.argv.includes('--light') ? 'light' : 'dark'
const store = {
  state: {
    profile: { name: '旅行者', xp: 620, gems: 9, streak: 4, longestStreak: 7, lastStudyDay: new Date().toISOString().slice(0, 10), petXp: 620, seasonPoints: 620, totalReviews: 42, correctReviews: 36 },
    settings: { uiLocale: 'zh', nativeLocale: 'zh', theme, dailyGoal: 10, sound: false, targetLang: 'en', activeDecks, onboarded: true },
    cards: {}, logs: [], runs: [], achievements: [],
  },
  version: 0,
}

const targets = await (await fetch(BASE + '/json')).json()
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
let seq = 0
const pending = new Map()
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result)
    pending.delete(m.id)
  }
}
await new Promise((r) => (ws.onopen = r))
const send = (method, params = {}) =>
  new Promise((res) => {
    const id = ++seq
    pending.set(id, res)
    ws.send(JSON.stringify({ id, method, params }))
  })
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r?.exceptionDetails) return `ERR:${r.exceptionDetails.text}`
  return r?.result?.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Network.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 940, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: SITE })
await sleep(900)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)

await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `
    window.__wqBoot = { bootAt: 0, doneAt: 0, pcts: [] };
    (function loop() {
      const b = window.__wqBoot;
      const txt = document.body ? document.body.innerText : '';
      if (!b.bootAt && txt.includes('正在打开词库')) b.bootAt = performance.now();
      if (!b.bootAt && txt.includes('正在装载')) b.bootAt = performance.now();
      if (!b.doneAt && txt && !txt.includes('正在装载') && !txt.includes('正在打开词库') && !txt.includes('词库没能')) {
        b.doneAt = performance.now();
      }
      const bar = document.querySelector('.boot-bar > div');
      if (bar && bar.style.width) b.pcts.push(bar.style.width);
      requestAnimationFrame(loop);
    })();
  `,
})

const nets = [
  ['4G 典型', 4 * 1024 * 1024 / 8, 70],
  ['Fast 3G', 1.6 * 1024 * 1024 / 8, 150],
  ['Slow 3G', 400 * 1024 / 8, 400],
]

const rows = []
for (const [label, down, latency] of nets) {
  await send('Network.setCacheDisabled', { cacheDisabled: true })
  await send('Network.emulateNetworkConditions', { offline: false, latency, downloadThroughput: down, uploadThroughput: down / 2 })
  await send('Page.navigate', { url: SITE + '?r=' + Date.now() + '#/' })
  // 等启动画面真的出现再截，别截到白屏
  let shotWait = 0
  while (shotWait < 8000) {
    if ((await ev(`Boolean(window.__wqBoot.bootAt)`)) === true) break
    await sleep(80)
    shotWait += 80
  }
  await sleep(220)
  const s = await send('Page.captureScreenshot', { format: 'png' })
  fs.mkdirSync('../shots', { recursive: true })
  fs.writeFileSync(`../shots/boot-${label.replace(/\s/g, '')}.png`, Buffer.from(s.data, 'base64'))

  let waited = 0
  while (waited < 40000) {
    if ((await ev(`Boolean(window.__wqBoot.doneAt)`)) === true) break
    await sleep(120)
    waited += 120
  }
  const done = await ev(`Math.round(window.__wqBoot.doneAt)`)
  const speed = (down / 1024).toFixed(0)
  rows.push([label, `${speed} KB/s`, `${done} ms`])
  console.log(`${label.padEnd(10)} ${String(speed).padStart(4)} KB/s → 首屏 ${done} ms`)
  await sleep(600)
}

await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
console.log('\n（本地 127.0.0.1 无法完全还原真实链路，仅作相对比较）')
ws.close()
