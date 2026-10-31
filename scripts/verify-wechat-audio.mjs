/**
 * 微信内置浏览器发音验证（用 UA 模拟 + 注入 WeixinJSBridge）。
 * node scripts/verify-wechat-audio.mjs [url] [--desktop]
 */
import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = process.argv[2] || 'http://127.0.0.1:4173/'
const DESKTOP = process.argv.includes('--desktop')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const UA_WX =
  'Mozilla/5.0 (Linux; Android 13; PGT-AN20 Build/TP1A.220905.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 MMWEBID/1234 MicroMessenger/8.0.44.2502(0x28002C34) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64'

const store = {
  state: {
    profile: { name: '旅行者', xp: 620, gems: 9, streak: 4, longestStreak: 7, lastStudyDay: new Date().toISOString().slice(0, 10), petXp: 620, seasonPoints: 620, totalReviews: 42, correctReviews: 36 },
    settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 10, sound: true, targetLang: 'en', activeDecks: ['en-cet4'], onboarded: true },
    cards: {}, logs: [], runs: [], achievements: [],
  },
  version: 0,
}

const targets = await (await fetch(BASE + '/json')).json()
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
let seq = 0
const pending = new Map()
const errs = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); return }
  if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push('[console] ' + m.params.args.map(a => a.value ?? a.description).join(' '))
}
await new Promise((r) => (ws.onopen = r))
const send = (method, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })) })
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r?.exceptionDetails) return 'ERR:' + r.exceptionDetails.text
  return r?.result?.value
}
const shot = async (name) => {
  const s = await send('Page.captureScreenshot', { format: 'png' })
  fs.mkdirSync('../shots', { recursive: true })
  fs.writeFileSync(`../shots/${name}.png`, Buffer.from(s.data, 'base64'))
}

await send('Page.enable')
await send('Runtime.enable')
await send('Log.enable')
await send('Network.enable')
if (DESKTOP) {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 940, deviceScaleFactor: 1, mobile: false })
} else {
  await send('Network.setUserAgentOverride', { userAgent: UA_WX, platform: 'Linux armv8l' })
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
}
await send('Network.setCacheDisabled', { cacheDisabled: true })
await send('Page.navigate', { url: SITE })
await sleep(900)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)

// 注入一个假的 WeixinJSBridge，模拟微信环境
if (!DESKTOP) {
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      Object.defineProperty(navigator, 'userAgent', { get: () => ${JSON.stringify(UA_WX)} });
      window.__wxBridgeCalls = [];
      window.WeixinJSBridge = { invoke: (name, params, cb) => { window.__wxBridgeCalls.push(name); cb && cb(); } };
    `,
  })
}

await send('Page.navigate', { url: SITE + '?r=' + Date.now() + '#/learn' })
await sleep(2600)

console.log('UA 含 MicroMessenger:', await ev(`/MicroMessenger/i.test(navigator.userAgent)`))
console.log('WeixinJSBridge 已注入:', await ev(`Boolean(window.WeixinJSBridge)`))
console.log('bridge 被调用:', await ev(`window.__wxBridgeCalls || []`))

// 先点一下页面任意处（模拟第一次触摸解锁）
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 195, y: 700, button: 'left', clickCount: 1 })
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 195, y: 700, button: 'left', clickCount: 1 })
await sleep(400)

console.log('\n--- 解锁后 ---')
console.log('音频容器存在:', await ev(`Boolean(document.getElementById('wq-audio'))`))
console.log('容器内 audio 数:', await ev(`document.getElementById('wq-audio')?.querySelectorAll('audio').length ?? 0`))
console.log('静音音频是否放起来了:', await ev(`(() => {
  const a = document.getElementById('wq-audio')?.querySelector('audio');
  return a ? { src: a.src.slice(0, 30), currentTime: a.currentTime, paused: a.paused } : null;
})()`))

// 点朗读按钮
const clicked = await ev(`(() => {
  const b = [...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === '朗读');
  if (!b) return 'no-button';
  b.click();
  return 'ok';
})()`)
console.log('\n点朗读:', clicked)
await sleep(1200)

console.log('所有 audio 元素:', await ev(`[...document.querySelectorAll('audio')].map(a => ({
  src: a.src.split('/').slice(-1)[0].slice(0, 28),
  paused: a.paused,
  t: Math.round(a.currentTime * 100) / 100,
  rate: a.playbackRate,
  inline: a.getAttribute('playsinline'),
}))`))

console.log('提示条是否误报:', await ev(`document.body.innerText.includes('点了朗读没声音')`))
await shot('wx-learn-audio')

// 手动触发一次「被静音」提示，看 UI
await ev(`window.dispatchEvent(new CustomEvent('wq:audio-blocked'))`)
await sleep(300)
console.log('提示条可显示:', await ev(`document.body.innerText.includes('点了朗读没声音')`))
await shot('wx-audio-hint')

console.log('\nJS 错误:', errs.length ? errs : '0')
ws.close()
