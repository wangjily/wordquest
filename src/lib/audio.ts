export type SoundKind = 'correct' | 'wrong' | 'combo' | 'level' | 'click'

let ctx: AudioContext | null = null

function audioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

const TONES: Record<SoundKind, { freq: number[]; dur: number; type: OscillatorType; gain: number }> = {
  correct: { freq: [660, 880], dur: 0.09, type: 'sine', gain: 0.06 },
  combo: { freq: [880, 1180, 1480], dur: 0.07, type: 'triangle', gain: 0.05 },
  wrong: { freq: [220, 160], dur: 0.16, type: 'sawtooth', gain: 0.05 },
  level: { freq: [523, 659, 784, 1046], dur: 0.1, type: 'sine', gain: 0.06 },
  click: { freq: [420], dur: 0.04, type: 'square', gain: 0.025 },
}

export function playSound(kind: SoundKind, enabled = true) {
  if (!enabled) return
  const ac = audioCtx()
  if (!ac) return
  const cfg = TONES[kind]
  cfg.freq.forEach((f, i) => {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = cfg.type
    osc.frequency.value = f
    const start = ac.currentTime + i * cfg.dur
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(cfg.gain, start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + cfg.dur)
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start(start)
    osc.stop(start + cfg.dur + 0.02)
  })
}

const TTS_LOCALE: Record<string, string> = { en: 'en-US', ja: 'ja-JP', es: 'es-ES' }

function ttsOf(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  return window.speechSynthesis
}

/**
 * 语音列表是异步加载的（Chrome 首帧基本是空数组），而且挑错 voice 会付出很大代价：
 * 选中 remote 语音（Google 那几个）每次都要联网取音频，国内环境下经常等到超时——
 * 这就是「点了播放要等很久」的主因。所以：
 *   1. 只认 localService 的本地语音
 *   2. 结果缓存起来，别每次点都重新 find
 *   3. 语音列表在 voiceschanged 后清缓存重挑
 */
const voiceCache = new Map<string, SpeechSynthesisVoice | null>()

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const ss = ttsOf()
  if (!ss) return null
  const cached = voiceCache.get(lang)
  if (cached !== undefined) return cached

  const all = ss.getVoices()
  if (!all.length) return null // 还没就绪，别把空结果缓存进去

  const prefix = lang.slice(0, 2).toLowerCase()
  const cands = all.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(prefix))
  const chosen = cands.find((v) => v.localService) ?? cands[0] ?? null
  voiceCache.set(lang, chosen)
  return chosen
}

let primed = false

/**
 * 预热语音引擎。首次朗读慢的原因有两层：语音列表还没加载完 + 引擎第一次要初始化。
 * 前者靠 getVoices() 提前触发，后者靠一条音量为 0 的 utterance 走完整个流程（听不见）。
 * 放一次就够了，重复调用无副作用。
 */
export function primeTTS() {
  const ss = ttsOf()
  if (!ss || primed) return
  primed = true

  ss.getVoices()
  const onVoices = () => voiceCache.clear()
  if (typeof ss.addEventListener === 'function') ss.addEventListener('voiceschanged', onVoices)
  else (ss as unknown as { onvoiceschanged: () => void }).onvoiceschanged = onVoices

  const warm = () => {
    try {
      const u = new SpeechSynthesisUtterance('a')
      u.volume = 0
      u.rate = 2
      u.lang = 'en-US'
      const v = pickVoice('en-US')
      if (v) u.voice = v
      ss.speak(u)
    } catch {
      /* 忽略 */
    }
  }
  // 浏览器普遍要求先有用户手势，挂在第一次点击/按键上最稳
  window.addEventListener('pointerdown', warm, { once: true, capture: true })
  window.addEventListener('keydown', warm, { once: true, capture: true })
}

/* ------------------------- 在线发音（有声词典直链） ------------------------- */

/**
 * 微信内置浏览器比普通浏览器苛刻得多，这是「PC 有声、微信没声」的主要原因：
 *
 * 1. 安卓走 X5 内核：**没挂进 DOM 的 `<audio>` 经常 play() 不报错也不出声**。
 *    所以所有音频元素统一挂到一个屏幕外的容器里，绝不游离。
 * 2. 安卓 X5 在 `WeixinJSBridgeReady` 之前会拦掉程序发起的播放，要先过 bridge。
 * 3. iOS 走 WKWebView：起播必须在用户手势里；被拒（NotAllowedError）时不能静音收场，
 *    要挂到下一次触摸补播。
 * 4. iOS 的硬件静音键会连 `<audio>` 一起静掉 —— 这个探不到，只能失败时提示用户。
 */
const UA = typeof navigator !== 'undefined' ? navigator.userAgent : ''
const IN_WECHAT = /MicroMessenger/i.test(UA)

/** 极短的静音 wav，只用来把音频通道「点开」 */
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA='

let pool: HTMLDivElement | null = null
function audioPool(): HTMLElement | null {
  if (typeof document === 'undefined' || !document.body) return null
  if (!pool) {
    pool = document.createElement('div')
    pool.id = 'wq-audio'
    pool.setAttribute('aria-hidden', 'true')
    pool.style.cssText =
      'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0.01;pointer-events:none'
    document.body.appendChild(pool)
  }
  return pool
}

function makeAudio(): HTMLAudioElement {
  const a = document.createElement('audio')
  a.preload = 'auto'
  // 这几个属性漏了，iOS 微信可能走全屏播放器，X5 可能干脆不出声
  a.setAttribute('playsinline', 'true')
  a.setAttribute('webkit-playsinline', 'true')
  a.setAttribute('x5-playsinline', 'true')
  const host = audioPool()
  if (host) host.appendChild(a)
  return a
}

let silent: HTMLAudioElement | null = null
/** 用一条静音音频把音频通道点开（微信 / iOS 必需，安卓无害） */
function pingAudioChannel() {
  try {
    if (!silent) {
      silent = makeAudio()
      silent.src = SILENT_WAV
      silent.volume = 0.001
    }
    const p = silent.play()
    if (p && typeof p.catch === 'function') p.catch(() => {})
  } catch {
    /* 忽略 */
  }
}

/**
 * 安卓微信 X5 在 `WeixinJSBridgeReady` 之前会拦掉所有程序音频。
 * 顺手调一次 getNetworkType —— 这是把 X5 音频通道打开的通行做法。
 */
export function hookWeChatAudio() {
  if (!IN_WECHAT || typeof document === 'undefined') return
  const w = window as unknown as {
    WeixinJSBridge?: { invoke?: (name: string, params: unknown, cb?: () => void) => void }
  }
  const unlock = () => {
    try {
      w.WeixinJSBridge?.invoke?.('getNetworkType', {}, () => {})
    } catch {
      /* 老版本没有这个方法 */
    }
    pingAudioChannel()
  }
  if (w.WeixinJSBridge) unlock()
  else document.addEventListener('WeixinJSBridgeReady', unlock, false)
}

/**
 * 在用户第一次触摸/点击时把音频通道真正打开。
 *
 * 浏览器（尤其 iOS Safari、安卓 X5）只承认「手势里发生的播放」，
 * 所以这函数必须直接挂在 pointerdown 上同步执行，不能包在 Promise / 定时器里。
 * 做的事很轻：恢复 AudioContext（提示音用）+ 播一帧静音（直链音频用）。
 */
export function unlockAudio() {
  try {
    const ac = audioCtx()
    if (ac && ac.state === 'suspended') void ac.resume()
  } catch {
    /* 忽略 */
  }
  pingAudioChannel()
}

/**
 * 直链候选，按可靠性排序。
 *
 * 单给有道一条链是不够的：某些网络（公司代理、校园网、海外出口、广告拦截插件）会
 * 单独掐掉 dict.youdao.com，而 fanyi.baidu.com 还活着。以前只有一条，挂了就直接
 * 跳系统朗读；系统朗读再挑到 Google 的 remote 语音，就成了「点了没声也不报错」。
 */
function onlineUrls(text: string, lang: string): string[] {
  const t = text.trim()
  if (!t) return []
  const q = encodeURIComponent(t)
  if (lang === 'ja') return [`https://dict.youdao.com/dictvoice?audio=${q}&le=jap`]
  if (lang !== 'en') return [] // 西语暂无可用直链，落到系统 TTS
  const baidu = `https://fanyi.baidu.com/gettts?lan=en&text=${q}&spd=3&source=web`
  // 有道对带空格的整句会返 500，整句只走百度
  return /\s/.test(t) ? [baidu] : [`https://dict.youdao.com/dictvoice?audio=${q}&type=2`, baidu]
}

// 元素现在是挂进 DOM 的真实节点，低端安卓扛不住太多，28 个足够覆盖预取窗口
const ONLINE_MAX = 28
const onlineCache = new Map<string, HTMLAudioElement>()

function elementFor(url: string): HTMLAudioElement {
  const hit = onlineCache.get(url)
  if (hit) return hit
  const a = makeAudio()
  a.preload = 'auto'
  a.src = url
  onlineCache.set(url, a)
  if (onlineCache.size > ONLINE_MAX) {
    const oldest = onlineCache.keys().next().value
    if (oldest) {
      onlineCache.get(oldest)?.remove()
      onlineCache.delete(oldest)
    }
  }
  return a
}

/** 提前把音频拉下来，等用户真点的时候就不用等下载 */
export function prefetchSpeak(text: string, lang: string) {
  if (!text) return
  const url = onlineUrls(text, lang)[0]
  if (url) elementFor(url).load()
}

/** 一次播放的结果：真的出声了 / 需要用户手势 / 这条路走不通 */
type PlayResult = 'ok' | 'blocked' | 'fail'

/** 最近一次真正在播的元素，听音辨词用它判断「刚才到底有没有出声」 */
let activeAudio: HTMLAudioElement | null = null

const clampRate = (r: number) => Math.max(0.5, Math.min(2, r))

/**
 * 播一条直链，并且**确认它真的在走**。
 *
 * 只信 play() 的 resolve 是不够的：广告拦截插件、被拦的域名、坏掉的解码都可能返回
 * 一个成功的 promise，然后一秒过去 currentTime 还是 0 —— 用户听到的就是静音。
 * 所以起播后 700ms 回看一眼时间轴，没走就换下一条源。
 */
function playUrl(url: string, rate: number): Promise<PlayResult> {
  return new Promise((resolve) => {
    const a = elementFor(url)
    let done = false
    let watch = 0
    const finish = (r: PlayResult) => {
      if (done) return
      done = true
      window.clearTimeout(watch)
      a.onerror = null
      resolve(r)
    }
    a.onerror = () => finish('fail')
    try {
      a.pause()
    } catch {
      /* 还没拿到元数据 */
    }
    try {
      a.currentTime = 0
    } catch {
      /* 同上 */
    }
    try {
      // 听音辨词会变速播；preservesPitch 默认开启，变速不变调
      a.playbackRate = clampRate(rate)
    } catch {
      /* X5 在没元数据时赋值可能抛错，保持默认速度 */
    }
    activeAudio = a

    watch = window.setTimeout(() => {
      finish(a.currentTime > 0 ? 'ok' : 'fail')
    }, 700)

    let p: Promise<void> | undefined
    try {
      p = a.play()
    } catch {
      finish('fail')
      return
    }
    if (p && typeof p.then === 'function') {
      p.catch((err: unknown) => {
        const name = (err as { name?: string } | null)?.name
        finish(name === 'NotAllowedError' ? 'blocked' : 'fail')
      })
    }
  })
}

/**
 * 系统朗读。返回是否真的开始念了。
 *
 * 这里有个跟「没声音」直接相关的坑：国内 Chrome 的英文语音往往只剩 Google 那几个
 * **remote** 语音，speak() 会正常排队、不报错，但音频要连 Google 才拿得到 —— 拿不到就
 * 永远停在「排队中」，既不 onstart 也不 onerror。所以必须自己起个看门狗，
 * 1.6 秒还没开口就判定失败，顺手 cancel 掉，别让卡住的队列拖死后面每一次朗读。
 */
function speakSynth(text: string, lang: string, rate: number): Promise<PlayResult> {
  return new Promise((resolve) => {
    const ss = ttsOf()
    if (!ss) {
      resolve('fail')
      return
    }
    let done = false
    let watch = 0
    const finish = (r: PlayResult) => {
      if (done) return
      done = true
      window.clearTimeout(watch)
      resolve(r)
    }
    try {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = TTS_LOCALE[lang] ?? 'en-US'
      u.rate = rate
      const v = pickVoice(u.lang)
      if (v) {
        u.voice = v
        u.lang = v.lang
      }
      u.onstart = () => finish('ok')
      u.onerror = (e) => {
        const code = (e as SpeechSynthesisErrorEvent | undefined)?.error
        // interrupted / canceled 是连点导致的自我打断，不算失败
        if (code === 'interrupted' || code === 'canceled') return
        finish(code === 'not-allowed' ? 'blocked' : 'fail')
      }
      // 只在真有东西在播/排队时打断，避免无意义的 cancel（Chrome 里频繁 cancel 会拖慢下一次起播）
      if (ss.speaking || ss.pending) ss.cancel()
      ss.speak(u)
      watch = window.setTimeout(() => {
        try {
          ss.cancel()
        } catch {
          /* 忽略 */
        }
        finish('fail')
      }, 1600)
    } catch {
      finish('fail')
    }
  })
}

/** 起播被拒时挂到下一次触摸补播 —— 必须是同步调用，异步会丢掉手势上下文 */
let retryArmed = false
function armRetry(fn: () => void) {
  if (retryArmed) return
  retryArmed = true
  const h = () => {
    retryArmed = false
    fn()
  }
  window.addEventListener('pointerdown', h, { once: true, capture: true })
}

/**
 * 无论直链音频还是系统朗读都没能出声时，提示用户一次。
 * 不提示的话用户只会觉得「按了没反应」，而这恰恰是最难自查的情况。
 */
let silenceWarned = false
function notifyBlocked() {
  if (silenceWarned) return
  silenceWarned = true
  window.dispatchEvent(new CustomEvent('wq:audio-blocked'))
}

/**
 * 朗读一个词或一句话。
 *
 * 注意：**发音不受「音效」开关控制**。那个开关只管答题、评级的提示音；
 * 把点读也挂上去，结果就是关掉音效后点喇叭什么都不发生，用户只会认为坏了。
 */
export function speak(text: string, lang: string, rate = 0.92) {
  if (!text) return
  void runChain(text, lang, rate)
}

async function runChain(text: string, lang: string, rate: number) {
  for (const url of onlineUrls(text, lang)) {
    const r = await playUrl(url, rate)
    if (r === 'ok') return
    if (r === 'blocked') {
      // 不在手势里：换源也放不出来，等下一次点击补播
      armRetry(() => speak(text, lang, rate))
      return
    }
  }
  const r = await speakSynth(text, lang, rate)
  if (r === 'ok') return
  if (r === 'blocked') {
    armRetry(() => speak(text, lang, rate))
    return
  }
  notifyBlocked()
}

/** 当前这次朗读是否真的出了声，听音辨词用它决定要不要露出音标 */
export function isAudioAlive(): boolean {
  return !!activeAudio && !activeAudio.paused && activeAudio.currentTime > 0
}

export type AudioProbe = 'online' | 'tts' | 'blocked'

/**
 * 发音自检：按 speak() 的真实顺序走一遍，告诉用户是哪一段坏了。
 * 设置页用它给出一句人话，而不是让用户对着「没声音」猜。
 */
export async function probeAudio(): Promise<AudioProbe> {
  for (const url of onlineUrls('hello', 'en')) {
    const r = await playUrl(url, 0.95)
    if (r === 'ok') return 'online'
    if (r === 'blocked') return 'blocked'
  }
  const r = await speakSynth('Hello, this is a sound test.', 'en', 0.95)
  return r === 'ok' ? 'tts' : r === 'blocked' ? 'blocked' : 'blocked'
}

export function hasTTS(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}
