/**
 * 校验「打进 APK 的那份网页资源」能否在安卓 WebView 环境里正常跑起来。
 *
 * 这里用 WebView 的 UA + 移动端视口模拟壳内环境，检查四件事：
 *   1. 首屏是否越过 BootScreen（语料加载链路通不通）
 *   2. 有没有 JS 报错
 *   3. 语料是不是真的从本地取到了
 *   4. 点喇叭后音频元素是否进入播放状态
 *
 * node scripts/verify-apk-www.mjs [url]
 */
import fs from 'node:fs'
import path from 'node:path'

const CDP = 'http://127.0.0.1:9222'
const SITE = process.argv[2] || 'http://127.0.0.1:4175/'
const OUT = path.resolve(process.cwd(), '..', 'shots')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 安卓 WebView 的典型 UA（带 ; wv 标记）
const UA_WEBVIEW =
  'Mozilla/5.0 (Linux; Android 13; Pixel 6 Build/TQ3A.230805.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36'

const targets = await (await fetch(CDP + '/json')).json()
const page = targets.find((t) => t.type === 'page')
if (!page) throw new Error('找不到可调试页面')

const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((res, rej) => {
  ws.onopen = res
  ws.onerror = rej
})

let id = 0
const pending = new Map()
const errors = []
const consoleErrors = []

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id)
    pending.delete(msg.id)
    msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result)
    return
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails
    errors.push(d.exception?.description || d.text)
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    consoleErrors.push(
      msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '),
    )
  }
}

const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const mid = ++id
    pending.set(mid, { res, rej })
    ws.send(JSON.stringify({ id: mid, method, params }))
  })

const ev = async (expr) => {
  const r = await send('Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
    awaitPromise: true,
  })
  return r.result?.value
}

fs.mkdirSync(OUT, { recursive: true })

await send('Page.enable')
await send('Runtime.enable')
await send('Network.enable')
await send('Network.setUserAgentOverride', {
  userAgent: UA_WEBVIEW,
  platform: 'Linux armv8l',
})
await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 2.75,
  mobile: true,
})
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })

// 记录语料请求的响应状态，确认是本地读到而不是 404
const corpusHits = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.method === 'Network.responseReceived') {
    const u = m.params.response.url
    if (u.includes('/corpus/')) corpusHits.push({ url: u.split('/').pop(), status: m.params.response.status })
  }
})

await send('Page.navigate', { url: SITE })
await sleep(1200)

// 全新用户：清掉本地进度，走一遍真正的首次启动
await ev('localStorage.clear(); true')
await send('Page.reload')
await sleep(1500)

const shot1 = path.join(OUT, 'apk-boot.png')
const s1 = await send('Page.captureScreenshot', { format: 'png' })
fs.writeFileSync(shot1, Buffer.from(s1.data, 'base64'))

// 等启动画面结束（语料就绪）
let ready = false
for (let i = 0; i < 40; i++) {
  ready = await ev(`!!document.querySelector('nav, [href="#/learn"]')`)
  if (ready) break
  await sleep(300)
}

const state = await ev(`(() => {
  const root = document.getElementById('root')
  const txt = root ? root.innerText.slice(0, 200) : ''
  const navCount = document.querySelectorAll('nav, a[href^="#/"]').length
  return { text: txt, navCount, boot: txt.includes('正在装载') || txt.includes('Loading') }
})()`)

const shot2 = path.join(OUT, 'apk-home.png')
const s2 = await send('Page.captureScreenshot', { format: 'png' })
fs.writeFileSync(shot2, Buffer.from(s2.data, 'base64'))

// 进学习页点一次喇叭
await ev(`location.hash = '#/learn'; true`)
await sleep(1400)

const audio = await ev(`(async () => {
  const btn = document.querySelector('[aria-label*="发音"], [aria-label*="朗读"], button[data-speak]')
  if (!btn) {
    // 兜底：找带音量图标的按钮
    const btns = [...document.querySelectorAll('button')]
    const hit = btns.find(b => /speaker|volume/i.test(b.innerHTML))
    if (!hit) return { ok: false, reason: '没找到朗读按钮', buttons: btns.length }
    hit.click()
  } else {
    btn.click()
  }
  await new Promise(r => setTimeout(r, 2600))
  const list = [...document.querySelectorAll('audio')]
  return {
    ok: true,
    audioCount: list.length,
    // 短单词的音频约 1 秒就播完，用「进度走过」而不是「正在播」来判断，
    // 否则播完再查一定是 paused
    played: list.filter(a => a.currentTime > 0).map(a => ({
      src: (a.currentSrc || a.src).slice(0, 60),
      t: Number(a.currentTime.toFixed(2)),
      ready: a.readyState,
    })),
  }
})()`)

const shot3 = path.join(OUT, 'apk-learn.png')
const s3 = await send('Page.captureScreenshot', { format: 'png' })
fs.writeFileSync(shot3, Buffer.from(s3.data, 'base64'))

// 检查进度是否落盘（App 里 localStorage 必须可靠）
const persisted = await ev(`!!localStorage.getItem('wordquest-v1')`)

console.log('=== 首屏 ===')
console.log('越过启动画面:', ready)
console.log('导航元素数:', state?.navCount)
console.log('文本片段:', JSON.stringify(state?.text?.replace(/\\s+/g, ' ').slice(0, 90)))
console.log('\n=== 语料 ===')
console.log('请求数:', corpusHits.length, '全部 200:', corpusHits.every((h) => h.status === 200))
console.log('样本:', corpusHits.slice(0, 3).map((h) => `${h.url}:${h.status}`).join(', '))
console.log('\n=== 音频 ===')
console.log(JSON.stringify(audio))
console.log('\n=== 存储 ===')
console.log('localStorage 已写入:', persisted)
console.log('\n=== 错误 ===')
console.log('JS 异常:', errors.length, errors.slice(0, 3))
console.log('console.error:', consoleErrors.length, consoleErrors.slice(0, 3))
console.log('\n截图:', shot1, shot2, shot3)

ws.close()
process.exit(errors.length || !ready ? 1 : 0)
