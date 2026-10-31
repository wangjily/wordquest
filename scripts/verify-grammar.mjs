/**
 * 语法练习验证：入口 → 答题 → 反馈 → 结果页 → 进度落库
 * node scripts/verify-grammar.mjs [url]
 */
import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = process.argv[2] || 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const store = {
  state: {
    profile: { name: '旅行者', xp: 620, gems: 9, streak: 4, longestStreak: 7, lastStudyDay: new Date().toISOString().slice(0, 10), petXp: 620, seasonPoints: 620, totalReviews: 42, correctReviews: 36 },
    settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 10, sound: false, targetLang: 'en', activeDecks: ['en-cet4'], onboarded: true },
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
const shot = async (name) => {
  const s = await send('Page.captureScreenshot', { format: 'png' })
  fs.mkdirSync('../shots', { recursive: true })
  fs.writeFileSync(`../shots/${name}.png`, Buffer.from(s.data, 'base64'))
}

await send('Page.enable')
await send('Runtime.enable')
const errors = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text)
})
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 940, deviceScaleFactor: 1, mobile: false })
await send('Network.setCacheDisabled', { cacheDisabled: true })
await send('Page.navigate', { url: SITE })
await sleep(800)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); localStorage.removeItem('wordquest-grammar-v1'); true`)

// 侧栏入口
await send('Page.navigate', { url: SITE + '?r=' + Date.now() + '#/grammar' })
await sleep(2000)
console.log('页面标题:', await ev(`document.querySelector('h1')?.innerText`))
console.log('总览:', await ev(`[...document.querySelectorAll('.grid > div')].slice(0,3).map(x=>x.innerText.replace(/\\n/g,' ')).join(' | ')`))
console.log('专题数:', await ev(`document.querySelectorAll('button.group').length`))
await shot('grammar-list')

// 进第一个专题
await ev(`document.querySelector('button.group')?.click()`)
await sleep(600)
console.log('\n--- 练习 ---')
console.log('题干:', await ev(`document.querySelector('.rounded-\\\\[20px\\\\] p')?.innerText ?? document.querySelector('p')?.innerText`))
console.log('选项数:', await ev(`document.querySelectorAll('.rounded-\\\\[20px\\\\] button').length`))
await shot('grammar-quiz')

// 故意选错（第 2 个选项），看反馈
await ev(`(() => { const bs = [...document.querySelectorAll('.rounded-\\\\[20px\\\\] button')]; bs[3]?.click() })()`)
await sleep(500)
console.log('反馈:', await ev(`document.body.innerText.includes('答错了') ? '答错了' : document.body.innerText.includes('答对了') ? '答对了' : 'none'`))
console.log('解析:', await ev(`(() => { const n = [...document.querySelectorAll('div')].find(d => d.className.includes('rounded-[16px]') && d.innerText.includes('答')); return n ? n.innerText.replace(/\\n/g,' ').slice(0,80) : 'none' })()`))
await shot('grammar-feedback')

// 一路点到底
for (let k = 0; k < 8; k++) {
  await ev(`(() => { const bs=[...document.querySelectorAll('button')]; const n=bs.find(b=>b.innerText.includes('下一题')||b.innerText.includes('看结果')); n?.click() })()`)
  await sleep(260)
  await ev(`(() => { const bs=[...document.querySelectorAll('.rounded-\\\\[20px\\\\] button')]; bs[0]?.click() })()`)
  await sleep(200)
}
await sleep(400)
console.log('\n结果页:', await ev(`document.body.innerText.split('\\n').filter(Boolean).slice(0,6).join(' | ')`))
console.log('进度落库:', await ev(`localStorage.getItem('wordquest-grammar-v1')`))
await shot('grammar-result')

// 回列表看进度
await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('返回专题')); b?.click() })()`)
await sleep(600)
console.log('列表进度:', await ev(`[...document.querySelectorAll('button.group')].slice(0,3).map(x=>x.innerText.replace(/\\n/g,' ')).join(' || ')`))

console.log('ERRORS:', errors.length)
errors.slice(0, 4).forEach((e) => console.log('  !', e.slice(0, 150)))
ws.close()
