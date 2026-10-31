/**
 * 听音辨词「没声音」现场勘查。
 *
 * 只做观测，不做修补：把 <audio> 的真实状态、有道/百度直链的网络响应、
 * speechSynthesis 的可用性、以及 wq:audio-blocked 是否触发，一次性摊开。
 *
 * node scripts/debug-echo-audio.mjs [url]
 */
const BASE = 'http://127.0.0.1:9222'
const SITE = process.argv[2] || 'http://39.106.105.5/words/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const targets = await (await fetch(`${BASE}/json`)).json()
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
let seq = 0
const pending = new Map()
const net = []
const consoleMsgs = []
const exceptions = []

ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result)
    pending.delete(m.id)
    return
  }
  if (m.method === 'Network.responseReceived') {
    const u = m.params.response.url
    if (/youdao|baidu|\.mp3|tts/i.test(u)) net.push({ url: u.slice(0, 110), status: m.params.response.status, type: m.params.type, mime: m.params.response.mimeType })
  }
  if (m.method === 'Network.loadingFailed') {
    net.push({ failed: m.params.errorText, type: m.params.type, id: m.params.requestId })
  }
  if (m.method === 'Runtime.consoleAPICalled') consoleMsgs.push(m.params.args.map((a) => a.value ?? a.description).join(' '))
  if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)
}
await new Promise((r) => (ws.onopen = r))
const send = (m, p = {}) =>
  new Promise((res) => {
    const i = ++seq
    pending.set(i, res)
    ws.send(JSON.stringify({ id: i, method: m, params: p }))
  })
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }))?.result?.value

await send('Page.enable')
await send('Runtime.enable')
await send('Network.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Emulation.setUserAgentOverride', {
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36',
})

await send('Page.navigate', { url: SITE })
await sleep(3000)

// 装探针：audio 播放失败原因 + 提示条事件
await ev(`(() => {
  window.__wq = { blocked: 0, playCalls: [], synth: [] };
  window.addEventListener('wq:audio-blocked', () => { window.__wq.blocked += 1 });
  const proto = HTMLMediaElement.prototype;
  const orig = proto.play;
  proto.play = function () {
    const p = orig.apply(this, arguments);
    const rec = { src: (this.currentSrc || this.src || '').slice(-60), ok: null, err: null };
    window.__wq.playCalls.push(rec);
    if (p && p.then) p.then(() => { rec.ok = true }).catch((e) => { rec.ok = false; rec.err = e && e.name });
    return p;
  };
  return true;
})()`)

console.log('页面标题:', await ev('document.title'), '| URL:', await ev('location.href'))

// 进游戏页（hash 路由）
await ev(`location.hash = '#/games/echo'`)
await sleep(2600)
const readyText = await ev(`document.body.innerText.split('\\n').filter(Boolean).slice(0, 8)`)
console.log('准备页:', JSON.stringify(readyText))

// 点开始（真鼠标）
const startBtn = await ev(`(() => { const b = document.querySelector('[data-act="start"]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) } })()`)
console.log('开始按钮:', JSON.stringify(startBtn))
if (!startBtn) {
  console.log('找不到开始按钮，页面文本:', JSON.stringify((await ev('document.body.innerText')).slice(0, 300)))
  ws.close()
  process.exit(0)
}
for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
  await send('Input.dispatchMouseEvent', { type, x: startBtn.x, y: startBtn.y, button: 'left', clickCount: 1 })
  await sleep(50)
}
await sleep(1800)

const snapshot = () =>
  ev(`(() => {
    const out = {
      audios: [...document.querySelectorAll('audio')].map((a) => ({
        src: (a.currentSrc || a.src || '').slice(-58),
        paused: a.paused,
        t: Math.round(a.currentTime * 100) / 100,
        dur: Number.isFinite(a.duration) ? Math.round(a.duration * 100) / 100 : String(a.duration),
        ready: a.readyState,
        net: a.networkState,
        err: a.error ? a.error.code + ':' + (a.error.message || '') : null,
        rate: a.playbackRate,
        muted: a.volume === 0,
      })),
      blocked: window.__wq ? window.__wq.blocked : null,
      playCalls: window.__wq ? window.__wq.playCalls.slice(-4) : null,
      synth: (() => {
        const ss = window.speechSynthesis;
        if (!ss) return null;
        const vs = ss.getVoices();
        return { voices: vs.length, en: vs.filter((v) => v.lang.startsWith('en')).length, speaking: ss.speaking, pending: ss.pending, paused: ss.paused };
      })(),
      hasTTS: 'speechSynthesis' in window,
      tip: (document.body.innerText.match(/听发音[^\\n]*/) || [])[0] || null,
    };
    return out;
  })()`)

console.log('首题自动播报后:', JSON.stringify(await snapshot(), null, 1))

// 点大喇叭
const spk = await ev(`(() => { const b = document.querySelector('button[aria-label]'); const all = [...document.querySelectorAll('button')].map(b => ({ label: b.getAttribute('aria-label'), ...(() => { const r = b.getBoundingClientRect(); return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), w: Math.round(r.width) } })() })); return { all: all.slice(0, 6) } })()`)
console.log('按钮清单:', JSON.stringify(spk))
const big = spk.all.find((b) => b.w >= 90) || spk.all[1]
if (big) {
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
    await send('Input.dispatchMouseEvent', { type, x: big.x, y: big.y, button: 'left', clickCount: 1 })
    await sleep(50)
  }
  await sleep(1500)
  console.log('点喇叭后:', JSON.stringify(await snapshot(), null, 1))
}

console.log('TTS 相关网络:', JSON.stringify(net.slice(0, 8), null, 1))
console.log('控制台:', JSON.stringify(consoleMsgs.slice(-5)))
console.log('异常:', JSON.stringify(exceptions.slice(-3)))
ws.close()
