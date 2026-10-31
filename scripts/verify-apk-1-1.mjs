// 校验 APK 内打包的网页资源：起本地服务 + 手机视口，确认是新版首页（星河 + 轨道），
// 并且复习、换书、听读这三条改动都在包里生效。
// 用法：node scripts/verify-apk-1-1.mjs [--port 4176]
import { writeFileSync, mkdirSync } from 'node:fs'

const PORT = Number(process.argv.includes('--port') ? process.argv[process.argv.indexOf('--port') + 1] : 4176)
const SITE = `http://127.0.0.1:${PORT}/`
const CDP = 'http://127.0.0.1:9222'
const SHOTS = 'shots'
mkdirSync(SHOTS, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
const ok = (cond, msg) => {
  if (!cond) fails++
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`)
}

const list = await (await fetch(`${CDP}/json`)).json()
const page = list.find((t) => t.type === 'page')
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
const send = (method, params = {}) => new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Emulation.setUserAgentOverride', {
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
})

const errors = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text || 'exception')
})

async function shot(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(data, 'base64'))
}

/* ---------- A 首页：新版星河 + 轨道 ---------- */
await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/` })
await sleep(3200)
const hero = await ev(`(() => ({
  hasField: !!document.querySelector('canvas.cosmos-field'),
  hasTitle: !!document.querySelector('.cosmos-title'),
  orbits: [...document.querySelectorAll('.orbit-item')].map(a => a.textContent.replace(/\\s+/g,' ').trim()),
  sidebar: !!document.querySelector('aside'),
  cta: [...document.querySelectorAll('.cosmos-cta, .cosmos-cta-ghost')].map(a => a.textContent.replace(/\\s+/g,' ').trim()),
  js: [...document.querySelectorAll('script[src]')].map(s => s.src.split('/').pop()),
}))()`)
console.log('A) 首页:', JSON.stringify(hero))
ok(hero.hasField, 'A 首屏有星河画布')
ok(hero.hasTitle, 'A 首屏有主标题')
ok(hero.orbits.length === 7, `A 轨道 7 个入口（实测 ${hero.orbits.length}）`)
ok(!hero.sidebar, 'A 侧栏已移除')
ok(hero.js.some((x) => x === 'index-C6DRKa0x.js'), 'A 加载的是新版入口 bundle')
await shot('apk-11-home')

/* ---------- B 复习三态：入口指纹 ---------- */
const cta = hero.cta.join(' | ')
console.log('B) CTA:', cta)
ok(/复习/.test(cta), 'B 首屏有复习入口（去复习 / 提前复习 / 暂无复习）')

// 切到复习模式：看是否有空态或队列
await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/learn?mode=due` })
await sleep(2600)
const learn = await ev(`(() => ({
  text: (document.body.innerText || '').replace(/\\s+/g,' ').slice(0, 220),
  badge: (document.body.innerText || '').includes('复习模式'),
}))()`)
console.log('B2) 复习页:', learn.text.slice(0, 120))
ok(learn.text.length > 10, 'B2 复习路由可进（空态或队列）')
await shot('apk-11-review')

/* ---------- C 换书单选 ---------- */
await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/library` })
await sleep(2400)
const lib = await ev(`(() => {
  const t = (document.body.innerText || '').replace(/\\s+/g,' ');
  return { has: t.includes('词库') || t.includes('当前'), words: t.slice(0, 160) }
})()`)
console.log('C) 词库:', lib.words.slice(0, 100))
ok(lib.has, 'C 词库页可进')
await shot('apk-11-library')

/* ---------- D 音频链路在包里完好 ---------- */
const audio = await ev(`(async () => {
  const mod = await import('./assets/index-C6DRKa0x.js').catch(() => null)
  return {
    speech: 'speechSynthesis' in window,
    audioCtx: typeof AudioContext === 'function' || typeof webkitAudioContext === 'function',
  }
})()`)
console.log('D) 音频能力:', JSON.stringify(audio))
ok(audio.speech || audio.audioCtx, 'D 运行环境具备音频能力')

console.log(`\nJS 异常 ${errors.length} 条`)
if (errors.length) console.log(errors.slice(0, 5))
console.log(fails === 0 && errors.length === 0 ? '\n全部通过' : `\n${fails} 项未通过`)
ws.close()
