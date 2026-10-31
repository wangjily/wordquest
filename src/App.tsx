import { useEffect, useState, useSyncExternalStore } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { VolumeX, X } from 'lucide-react'
import Shell from '@/components/Shell'
import Home from '@/pages/Home'
import Learn from '@/pages/Learn'
import Games from '@/pages/Games'
import GrammarPage from '@/pages/Grammar'
import Falling from '@/pages/Falling'
import Boss from '@/pages/Boss'
import Forge from '@/pages/Forge'
import Echo from '@/pages/Echo'
import LibraryPage from '@/pages/Library'
import ProfilePage from '@/pages/Profile'
import SettingsPage from '@/pages/Settings'
import Assistant from '@/components/Assistant'
import CommandPalette from '@/components/CommandPalette'
import { bootCorpus, corpusError, corpusStatus, isDeckLoaded, subscribeCorpus, useDecksReady } from '@/data/corpus'
import { DECKS } from '@/data'
import { primeTTS, unlockAudio, hookWeChatAudio } from '@/lib/audio'
import { hideSplash, initNative } from '@/lib/native'
import { useGame } from '@/lib/store'
import { useT } from '@/i18n'

function useCorpusStatus() {
  return useSyncExternalStore(subscribeCorpus, corpusStatus, corpusStatus)
}

/** 词库加载中 / 失败时的启动画面 */
function BootScreen({
  status,
  error,
  activeDecks,
}: {
  status: string
  error: string | null
  activeDecks: string[]
}) {
  const t = useT()
  const [slow, setSlow] = useState(false)

  // 1.5 秒还停在这儿，基本就是网络在慢慢爬了，给句话让用户别怀疑卡死
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 1500)
    return () => window.clearTimeout(timer)
  }, [])

  const total = activeDecks.length
  // 每次渲染重算即可：几本词书，代价可以忽略，但必须跟着 corpus 的 version 走
  const loaded = activeDecks.filter(isDeckLoaded).length
  const pendingId = activeDecks.find((id) => !isDeckLoaded(id))
  const pendingTitle = pendingId ? DECKS.find((d) => d.id === pendingId)?.title : null
  // 索引到了、但手上的词书还没齐 —— 这时才谈得上「进度」
  const loadingDecks = status === 'ready' && total > 0 && loaded < total
  const pct = total ? Math.round((loaded / total) * 100) : 0

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="relative">
        <div className="h-16 w-16 animate-pulse rounded-[22px] bg-gradient-to-br from-[var(--brand)] to-[#42D6C0] opacity-90 blur-[1px]" />
        <div className="absolute inset-0 grid place-items-center text-[26px]">📖</div>
      </div>
      {status === 'error' ? (
        <>
          <div className="text-[15px] font-medium">{t('boot.error')}</div>
          <div className="max-w-[320px] text-[12.5px] leading-relaxed text-ink-3">{error}</div>
          <button className="btn btn-primary px-5" onClick={() => void bootCorpus()}>
            {t('boot.retry')}
          </button>
        </>
      ) : (
        <>
          <div className="text-[15px] font-medium">
            {loadingDecks && pendingTitle
              ? `${t('boot.deck')}《${pendingTitle.zh}》`
              : t('boot.index')}
          </div>
          <div className="text-[12.5px] text-ink-3">
            {loadingDecks
              ? total > 1
                ? `${loaded} / ${total} ${t('boot.deckUnit')}`
                : t('boot.deckHint')
              : t('boot.indexHint')}
          </div>
          <div className="boot-bar h-1 w-40 overflow-hidden rounded-full bg-[var(--surface-2)]">
            {loadingDecks ? (
              <div
                className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-500 ease-out"
                style={{ width: `${Math.max(8, pct)}%` }}
              />
            ) : (
              <div className="h-full w-1/2 animate-[bootslide_1.1s_ease-in-out_infinite] rounded-full bg-[var(--brand)]" />
            )}
          </div>
          <div className="h-4 text-[11.5px] text-ink-3 opacity-80">
            {slow ? t('boot.slow') : ''}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * 点了朗读但音频完全没动（iOS 静音键 / 微信策略 / 系统媒体音量为 0）时提示一次。
 * 这类问题代码里探不到，只能等播放失败后给用户一个可执行的下一步。
 */
function AudioHint() {
  const t = useT()
  const [show, setShow] = useState(false)

  useEffect(() => {
    const on = () => setShow(true)
    window.addEventListener('wq:audio-blocked', on)
    return () => window.removeEventListener('wq:audio-blocked', on)
  }, [])

  if (!show) return null

  return (
    <div className="fixed inset-x-3 top-3 z-[60] flex items-start gap-2.5 rounded-2xl border border-line bg-[var(--bg-soft)] px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-2 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.65)] lg:left-1/2 lg:w-[440px] lg:-translate-x-1/2">
      <VolumeX size={15} className="mt-[2px] shrink-0 text-[var(--brand)]" />
      <span className="flex-1">{t('audio.blocked')}</span>
      <button
        type="button"
        aria-label={t('ai.close')}
        className="-m-1 shrink-0 rounded-lg p-1 text-ink-3 hover:text-[var(--text)]"
        onClick={() => setShow(false)}
      >
        <X size={14} />
      </button>
    </div>
  )
}

/** 原生壳里的轻提示（目前只用于返回键「再按一次退出」） */
function Toast() {
  const t = useT()
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    let timer = 0
    const on = (e: Event) => {
      const key = (e as CustomEvent<string>).detail
      if (!key) return
      setMsg(key === 'exit' ? t('native.exitHint') : key)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setMsg(null), 1800)
    }
    window.addEventListener('wq:toast', on)
    return () => {
      window.removeEventListener('wq:toast', on)
      window.clearTimeout(timer)
    }
  }, [t])

  if (!msg) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[70] flex justify-center px-6 lg:bottom-10">
      <div className="rounded-full border border-line bg-[var(--bg-soft)] px-4 py-2 text-[12.5px] text-ink-2 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)]">
        {msg}
      </div>
    </div>
  )
}

export default function App() {
  const t = useT()
  const theme = useGame((s) => s.settings.theme)
  const status = useCorpusStatus()
  const error = corpusError()
  const activeDecks = useGame((s) => s.settings.activeDecks)
  const decksReady = useDecksReady(activeDecks)

  useEffect(() => {
    void bootCorpus()
    // 不再有引导页：首次进来直接用默认设置（CET-4 + 每日 12 词）进首页
    const st = useGame.getState()
    if (!st.settings.onboarded) st.patchSettings({ onboarded: true })
    // 提前把语音引擎和语音列表热起来，点朗读时才不用等
    primeTTS()
    // 微信内置浏览器（安卓 X5）要先过 bridge 才允许出声
    hookWeChatAudio()
    // 手机端要等第一次触摸才能起播，先把这条通道打开
    window.addEventListener('pointerdown', unlockAudio, { once: true, capture: true })
    // 原生壳：状态栏、返回键、启动屏兜底（浏览器里是空操作）
    void initNative()
  }, [])

  // 界面真正可用了才揭开启动图，否则会先闪一下空白再出内容
  const ready = status === 'ready' && decksReady
  useEffect(() => {
    if (ready) void hideSplash()
  }, [ready])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'light' ? '#F6F7FB' : '#080B14')
  }, [theme])

  useEffect(() => {
    const lang = useGame.getState().settings.uiLocale
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  }, [])

  // 索引到了就渲染界面；在学的词书词条未就绪时同样停在启动画面，避免闪一下空队列
  if (status !== 'ready' || !decksReady) {
    return <BootScreen status={status} error={error} activeDecks={activeDecks} />
  }

  return (
    <>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Home />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/games" element={<Games />} />
          <Route path="/grammar" element={<GrammarPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        <Route path="/games/falling" element={<Falling />} />
        <Route path="/games/boss" element={<Boss />} />
        <Route path="/games/forge" element={<Forge />} />
        <Route path="/games/echo" element={<Echo />} />
      </Routes>
      <CommandPalette />
      <Assistant />
      <AudioHint />
      <Toast />
    </>
  )
}
