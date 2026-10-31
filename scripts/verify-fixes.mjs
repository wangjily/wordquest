/** 回归验证：单本词书 / 换书串书 / 返回上一级 / 音效关闭时仍能点读 */
import fs from 'node:fs'

const BASE = 'http://127.0.0.1:9222'
const SITE = process.argv[2] || 'http://127.0.0.1:4173/'
const OUT = 'C:/Users/孙续/WorkBuddy/2026-10-27-22-11-41/shots'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const now = Date.now()

const mkStore = (activeDecks, sound = false, version = 0) => ({
  state: {
    profile: { name: 'T', xp: 1480, gems: 42, streak: 6, longestStreak: 9, lastStudyDay: new Date().toISOString().slice(0, 10), petXp: 3020, seasonPoints: 1480, totalReviews: 88, correctReviews: 74 },
    settings: { uiLocale: 'zh', nativeLocale: 'zh', theme: 'dark', dailyGoal: 12, sound, targetLang: 'en', activeDecks, onboarded: true },
    cards: {}, logs: [], runs: [], achievements: [],
  },
  version,
})

const targets = await (await fetch(`${BASE}/json`)).json()
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
let seq = 0
const pending = new Map()
const errs = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)
}
await new Promise((r) => (ws.onopen = r))
const send = (m, p = {}) => new Promise((res) => { const i = ++seq; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })) })
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }))?.result?.value
const shot = async (name) => {
  const s = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(s.data, 'base64'))
}
await send('Page.enable'); await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })

const seed = async (store) => {
  await send('Page.navigate', { url: SITE }); await sleep(800)
  await ev(`localStorage.setItem('wordquest-v1', ${JSON.stringify(JSON.stringify(store))}); true`)
}
const hash = () => ev('decodeURIComponent(location.hash)')

/* ---------- 1. 旧数据（多本）迁移 ---------- */
await seed(mkStore(['en-cet4', 'en-senior'], false, 0))
await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/` }); await sleep(2600)
const migrated = await ev(`JSON.parse(localStorage.getItem('wordquest-v1')).state.settings.activeDecks`)
console.log('1) 旧数据三本→迁移结果:', JSON.stringify(migrated), JSON.stringify(migrated) === '["en-cet4"]' ? 'OK' : 'FAIL')

/* ---------- 2. 词库换书 → 学习页是否换了书 ---------- */
await seed(mkStore(['en-cet4']))
await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/library` }); await sleep(2600)

// 点「高中」学段
await ev(`(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '高中');
  b && b.click(); return !!b;
})()`)
await sleep(700)
// 点高考词书那一行（选中 + 打开详情）
const picked = await ev(`(() => {
  const row = [...document.querySelectorAll('.lib-row')].find((r) => r.textContent.includes('高考'));
  if (!row) return 'no-row';
  row.click(); return row.textContent.trim().slice(0, 20);
})()`)
await sleep(600)
const activeAfterPick = await ev(`JSON.parse(localStorage.getItem('wordquest-v1')).state.settings.activeDecks`)
console.log('2a) 选中高考后 activeDecks:', JSON.stringify(activeAfterPick), picked)

// 详情面板「开始学习」
const started = await ev(`(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /开始学习|继续学习|学这本/.test(x.textContent));
  if (!b) return 'no-btn';
  b.click(); return b.textContent.trim();
})()`)
await sleep(1800)
const h2 = await hash()
const lemma2 = await ev(`document.querySelector('h1')?.textContent || ''`)
console.log('2b) 点「' + started + '」→', h2, '| 首词:', lemma2)

/* ---------- 3. 学习页返回是否回到词库 ---------- */
await ev(`document.querySelector('button[aria-label="返回"]')?.click()`)
await sleep(900)
const h3 = await hash()
console.log('3) 返回后:', h3, h3 === '#/library' ? 'OK（回到上一级）' : 'FAIL（期望 #/library）')

/* ---------- 4. 关闭音效后点读仍要出声 ---------- */
await seed(mkStore(['en-cet4'], false))
await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/learn?deck=en-cet4` }); await sleep(2400)
// 必须用真实鼠标事件：DOM .click() 不带用户手势，Chromium 会按自动播放策略拒掉
const pos = await ev(`(() => {
  const b = document.querySelector('button[aria-label="朗读"]');
  if (!b) return null; const r = b.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
})()`)
if (pos) {
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
    await send('Input.dispatchMouseEvent', { type, x: pos.x, y: pos.y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 })
    await sleep(60)
  }
}
await sleep(1400)
const audio = await ev(`(() => {
  const els = [...document.querySelectorAll('#wq-audio audio')];
  const playing = els.filter((a) => !a.paused || a.currentTime > 0).map((a) => ({ src: a.currentSrc.slice(-40), t: +a.currentTime.toFixed(2) }));
  return { total: els.length, playing, tts: window.speechSynthesis ? window.speechSynthesis.speaking : null, hint: document.body.innerText.includes('没有声音') };
})()`)
console.log('4) 音效关闭时点读:', JSON.stringify(audio))
await shot('fix-learn-audio-off')

/* ---------- 5. 截图：单本书的词库页 ---------- */
await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/library` }); await sleep(2400)
await ev(`(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '高中');
  b && b.click();
})()`)
await sleep(800)
await ev(`(() => {
  const row = [...document.querySelectorAll('.lib-row')].find((r) => r.textContent.includes('高考'));
  row && row.click();
})()`)
await sleep(700)
await shot('fix-library-single')
console.log('5) 截图 fix-library-single.png')

/* ---------- 6. 行内圆圈按钮 = 单选切换 ---------- */
await seed(mkStore(['en-cet4']))
await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/library` }); await sleep(2400)
await ev(`(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '高中');
  b && b.click();
})()`)
await sleep(700)
const switched = await ev(`(() => {
  const row = [...document.querySelectorAll('.lib-row')].find((r) => r.textContent.includes('高考'));
  if (!row) return 'no-row';
  const btn = row.querySelector('button[aria-label]');
  btn.click();
  return btn.getAttribute('aria-label');
})()`)
await sleep(600)
const afterSwitch = await ev(`JSON.parse(localStorage.getItem('wordquest-v1')).state.settings.activeDecks`)
const badges = await ev(`[...document.querySelectorAll('.lib-row')].map((r) => r.textContent.includes('学习中') ? r.textContent.slice(0, 12) : null).filter(Boolean)`)
const header = await ev(`document.querySelector('header p')?.textContent || ''`)
console.log('6) 点圆圈(' + switched + ') → activeDecks:', JSON.stringify(afterSwitch), '| 学习中标记:', JSON.stringify(badges), '| 头部:', header)

/* ---------- 7. 没有历史时返回的兜底 ---------- */
await send('Page.navigate', { url: 'about:blank' }); await sleep(300)
await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/learn` }); await sleep(2400)
await ev(`document.querySelector('button[aria-label="返回"]')?.click()`)
await sleep(800)
const h7 = await hash()
console.log('7) 直接打开 /learn 点返回:', h7, h7 === '#/' ? 'OK（兜底首页）' : 'CHECK')

/* ---------- 8. 手机端截图 ---------- */
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/library` }); await sleep(2400)
await shot('fix-library-single-m')
await send('Page.navigate', { url: `${SITE}?r=${Date.now()}#/learn` }); await sleep(2000)
await shot('fix-learn-m')

console.log('\nJS 异常:', errs.length, errs.slice(0, 3))
ws.close()
