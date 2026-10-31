/**
 * 模拟「直链音频被拦」：把 dict.youdao / fanyi.baidu 全禁掉，看系统朗读这条兜底链路
 * 到底有没有真的出声，还是回到了「一声不响也不报错」。
 *
 * node scripts/probe-tts-fallback.mjs [url]
 */
const BASE = 'http://127.0.0.1:9222'
const SITE = process.argv[2] || 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const targets = await (await fetch(`${BASE}/json`)).json()
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
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
await send('Network.setBlockedURLs', { urls: ['*dict.youdao.com*', '*fanyi.baidu.com*'] })
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: SITE })
await sleep(3000)

// 记录每一次 speechSynthesis 调用与生命周期事件
await ev(`(() => {
  window.__tts = { calls: [], starts: 0, ends: 0, errors: [], blocked: 0 };
  window.addEventListener('wq:audio-blocked', () => { window.__tts.blocked += 1 });
  const orig = speechSynthesis.speak.bind(speechSynthesis);
  speechSynthesis.speak = function (u) {
    const rec = { text: u.text, lang: u.lang, voice: u.voice ? u.voice.name + '/' + (u.voice.localService ? 'local' : 'remote') : null, volume: u.volume, started: false, error: null };
    window.__tts.calls.push(rec);
    const os = u.onstart, oe = u.onerror, ou = u.onend;
    u.onstart = function (e) { rec.started = true; window.__tts.starts += 1; os && os.call(this, e) };
    u.onerror = function (e) { rec.error = e.error; window.__tts.errors.push(e.error); oe && oe.call(this, e) };
    u.onend = function (e) { window.__tts.ends += 1; ou && ou.call(this, e) };
    return orig(u);
  };
  return true;
})()`)

// 进学习页点一下喇叭（最简单的单点验证）
await ev(`location.hash = '#/learn'`)
await sleep(2600)
const spk = await ev(`(() => { const b = document.querySelector('button[aria-label]'); const list = [...document.querySelectorAll('button')]; const t = list.find(b => (b.getAttribute('aria-label')||'').includes('朗读') || (b.getAttribute('aria-label')||'').includes('Speak')); const el = t || list[1]; const r = el.getBoundingClientRect(); return { label: el.getAttribute('aria-label'), x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2) } })()`)
console.log('喇叭按钮:', JSON.stringify(spk))
for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
  await send('Input.dispatchMouseEvent', { type, x: spk.x, y: spk.y, button: 'left', clickCount: 1 })
  await sleep(50)
}
await sleep(2500)
console.log('TTS 记录:', JSON.stringify(await ev('window.__tts'), null, 1))
console.log('语音列表:', JSON.stringify(await ev(`(() => { const vs = speechSynthesis.getVoices(); return { total: vs.length, en: vs.filter(v=>v.lang.startsWith('en')).map(v => v.name + '/' + (v.localService?'local':'remote')) } })()`)))
console.log('音频元素:', JSON.stringify(await ev(`[...document.querySelectorAll('audio')].map(a => ({ src: (a.currentSrc||a.src||'').slice(-46), paused: a.paused, t: a.currentTime, err: a.error && a.error.code }))`)))
ws.close()
