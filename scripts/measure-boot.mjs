/**
 * 启动耗时测量：从导航到「启动画面消失 / 主界面可交互」花了多久，
 * 以及这段时间里到底下载了什么。
 *
 * 用法：node scripts/measure-boot.mjs [activeDecks(逗号分隔)] [--cold]
 */
import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const argv = process.argv.slice(2)
const cold = argv.includes('--cold')
const deckArg = argv.find((a) => !a.startsWith('--')) || 'en-cet4'
const activeDecks = deckArg.split(',').filter(Boolean)

const store = {
  state: {
    profile: { name: '旅行者', xp: 620, gems: 9, streak: 4, longestStreak: 7, lastStudyDay: new Date().toISOString().slice(0, 10), petXp: 620, seasonPoints: 620, totalReviews: 42, correctReviews: 36 },
    settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 10, sound: false, targetLang: 'en', activeDecks, onboarded: true },
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
await send('Network.setCacheDisabled', { cacheDisabled: cold })

// 先种 store，再重新导航，避免 onboarding 干扰
await send('Page.navigate', { url: SITE })
await sleep(700)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)

// 注入探针：记录启动画面出现/消失的时刻
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `
    window.__wqBoot = { t0: 0, bootAt: 0, doneAt: 0 };
    (function loop() {
      const b = window.__wqBoot;
      const txt = document.body ? document.body.innerText : '';
      if (!b.t0) b.t0 = performance.now();
      if (!b.bootAt && txt.includes('正在装载')) b.bootAt = performance.now();
      // 有缓存时启动画面可能一帧都看不到，所以不依赖 bootAt 来判定完成
      if (!b.doneAt && txt.includes('首页') && !txt.includes('正在装载') && !txt.includes('正在打开词库') && !txt.includes('词库没能')) {
        b.doneAt = performance.now();
        b.shell = txt.slice(0, 60).replace(/\\n/g, ' | ');
      }
      requestAnimationFrame(loop);
    })();
  `,
})

const navStart = Date.now()
await send('Page.navigate', { url: SITE + '?r=' + Date.now() + '#/' })
// 轮询等待主界面出现，最多 20s
let waited = 0
while (waited < 20000) {
  const done = await ev(`Boolean(window.__wqBoot && window.__wqBoot.doneAt)`)
  if (done === true) break
  await sleep(100)
  waited += 100
}
const wall = Date.now() - navStart

const boot = await ev(`JSON.stringify(window.__wqBoot)`)
const res = await ev(`JSON.stringify(performance.getEntriesByType('resource').map(r => ({
  n: r.name.split('/').pop().split('?')[0],
  t: Math.round(r.transferSize/1024),
  d: Math.round(r.duration)
})).filter(r => r.t > 0 || r.d > 40).sort((a,b) => a.d - b.d))`)

console.log(`\n=== ${activeDecks.join('+')} | ${cold ? '冷缓存' : '有缓存'} | 视口 1440x940 ===`)
console.log('探针:', boot)
console.log(`墙钟: ${wall} ms`)
const list = JSON.parse(res)
let totalKb = 0
for (const r of list) totalKb += r.t
console.log(`请求 ${list.length} 个，传输 ${totalKb} KB`)
for (const r of list.slice(-14)) console.log(`  ${String(r.t).padStart(5)}KB  ${String(r.d).padStart(5)}ms  ${r.n}`)

// 等 6 秒，看后台补全量语料有没有在跑、跑完没
await sleep(6000)
const after = await ev(`JSON.stringify({
  corpus: performance.getEntriesByType('resource').filter(r=>r.name.includes('/corpus/')).map(r=>r.name.split('/').pop()),
  kb: Math.round(performance.getEntriesByType('resource').filter(r=>r.name.includes('/corpus/')).reduce((s,r)=>s+r.transferSize,0)/1024)
})`)
console.log('6s 后语料分片:', after)

ws.close()
