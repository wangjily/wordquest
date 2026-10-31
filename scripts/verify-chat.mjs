/**
 * 助手闲聊能力验证：逐条发消息，把回复抠出来看。
 * node scripts/verify-chat.mjs [url]
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
await send('Network.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 940, deviceScaleFactor: 1, mobile: false })
await send('Network.setCacheDisabled', { cacheDisabled: true })
await send('Page.navigate', { url: SITE })
await sleep(900)
await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)
await send('Page.navigate', { url: SITE + '?r=' + Date.now() + '#/' })
await sleep(2200)

// 打开助手
await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='打开 AI 助手'); b?.click() })()`)
await sleep(700)

const setInput = (v) =>
  ev(`(() => {
    const ta = document.querySelector('textarea');
    if (!ta) return 'no-textarea';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, ${JSON.stringify(v)});
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return ta.value;
  })()`)

const clickSend = () =>
  ev(`(() => {
    const ta = document.querySelector('textarea');
    const btn = ta?.parentElement?.querySelector('button');
    if (!btn || btn.disabled) return 'disabled';
    btn.click();
    return 'ok';
  })()`)

/** 抓最后一条 AI 气泡的文本 */
const lastReply = () =>
  ev(`(() => {
    const list = [...document.querySelectorAll('div')].find(d =>
      typeof d.className === 'string' && d.className.includes('space-y-3') && d.className.includes('overflow-y-auto'));
    if (!list) return null;
    const msgs = [...list.children].filter(m => m.innerText && m.innerText.trim());
    return msgs.length ? msgs[msgs.length - 1].innerText : null;
  })()`)

async function ask(text, wait = 900) {
  await setInput(text)
  const st = await clickSend()
  if (st !== 'ok') {
    console.log(`\n【${text}】发送失败: ${st}`)
    return null
  }
  await sleep(wait)
  const r = await lastReply()
  console.log(`\n【用户】${text}\n【助手】${r}`)
  return r
}

console.log('=== 面板就绪 ===')
console.log('标题可见:', await ev(`document.body.innerText.includes('词跃助手')`))
console.log('快捷入口:', await ev(`(() => {
  const chips = [...document.querySelectorAll('button')].map(b => b.innerText.trim());
  return ['讲个笑话','陪我聊两句','今天该学什么？'].map(k => k + '=' + chips.includes(k));
})()`))

// 1) 笑话
const j1 = await ask('讲个笑话')
const j2 = await ask('再来一个')
const j3 = await ask('讲个笑话')
console.log('\n连续三个笑话是否互不相同:', j1 !== j2 && j2 !== j3 && j1 !== j3)

// 2) 情绪 / 安慰
await ask('好累啊，学不动了')
await ask('我记不住单词，感觉挺笨的')
await ask('明天就考试了，来不及了')

// 3) 闲聊
await ask('陪我聊两句')
await ask('你好')
await ask('你是谁')
await ask('谢谢')
await ask('晚安')
await ask('我家猫会开冰箱')

// 4) 回归：原有功能没被抢走
await ask('今天该复习什么')
await ask('abandon 是什么意思')

// 5) 快捷按钮「再来一个」能不能点
const before = await lastReply()
await ev(`(() => {
  const b = [...document.querySelectorAll('button')].find(x => x.innerText.trim() === '再来一个');
  b?.click(); return Boolean(b);
})()`)
await sleep(900)
const after = await lastReply()
console.log('\n点「再来一个」后有新内容:', before !== after)

// 6) chat chunk 是否真的按需加载
console.log('chat chunk 请求:', await ev(`performance.getEntriesByType('resource').filter(r => /chat-[\\w-]+\\.js/.test(r.name)).map(r => r.name.split('/').pop() + ' ' + Math.round(r.transferSize/1024) + 'KB')`))

await shot('assistant-chat')
ws.close()
