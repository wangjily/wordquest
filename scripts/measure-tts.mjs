/**
 * 语音起播延迟对比：旧逻辑（随便挑第一个 en）vs 新逻辑（localService 优先）
 * node scripts/measure-tts.mjs
 */
const BASE = 'http://127.0.0.1:9222'
const SITE = process.argv[2] || 'http://127.0.0.1:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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
const ev = async (expr, timeout = 30000) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, timeout })
  if (r?.exceptionDetails) return `ERR:${r.exceptionDetails.text}`
  return r?.result?.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Page.navigate', { url: SITE })
await sleep(1500)

const voices = await ev(`JSON.stringify(
  speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith('en'))
    .map(v => ({ name: v.name, lang: v.lang, local: v.localService }))
)`)
console.log('英文语音列表：')
for (const v of JSON.parse(voices)) console.log(`  ${v.local ? '本地' : '联网'}  ${v.name}  (${v.lang})`)

const oldPick = await ev(`(() => {
  const u = 'en-US';
  const vs = speechSynthesis.getVoices();
  const m = vs.find(v => v.lang.toLowerCase().startsWith(u.slice(0,2).toLowerCase()));
  return m ? m.name + (m.localService ? ' /本地' : ' /联网') : 'none';
})()`)
const newPick = await ev(`(() => {
  const prefix = 'en';
  const cands = speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().replace('_','-').startsWith(prefix));
  const c = cands.find(v => v.localService) ?? cands[0];
  return c ? c.name + (c.localService ? ' /本地' : ' /联网') : 'none';
})()`)
console.log(`\n旧逻辑会选：${oldPick}`)
console.log(`新逻辑会选：${newPick}`)

// 实测起播延迟
const measure = (pickExpr) => `(() => new Promise((resolve) => {
  const ss = speechSynthesis;
  ss.cancel();
  const t0 = performance.now();
  const u = new SpeechSynthesisUtterance('calculate');
  u.lang = 'en-US';
  u.rate = 0.92;
  ${pickExpr}
  let done = false;
  const fin = (label) => { if (done) return; done = true; resolve(label + ' ' + Math.round(performance.now() - t0) + ' ms'); };
  u.onstart = () => fin('起播');
  u.onerror = (e) => fin('error:' + e.error);
  ss.speak(u);
  setTimeout(() => fin('超时(3s无响应)'), 3000);
}))()`

console.log('\n--- 实测（无头环境不一定有音频设备，仅看相对差异）---')
for (let i = 0; i < 2; i++) {
  const a = await ev(measure(`const m = speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith('en')); if (m) u.voice = m;`))
  await sleep(400)
  const b = await ev(measure(`const cands = speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().replace('_','-').startsWith('en')); const m = cands.find(v => v.localService) ?? cands[0]; if (m) u.voice = m;`))
  console.log(`  第 ${i + 1} 轮  旧逻辑 ${a}  |  新逻辑 ${b}`)
  await sleep(400)
}

ws.close()
