import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, Gamepad2, Library, RotateCcw, Sparkles, Volume2 } from 'lucide-react'
import { WORD_MAP, ttsLocaleOf } from '@/data'
import type { Rating } from '@/data/types'
import { Bar } from '@/components/ui'
import { buildQueue, dueItems, earlyItems, useGame } from '@/lib/store'
import type { QueueItem } from '@/lib/store'
import { newCard, intervalLabel } from '@/lib/srs'
import { playSound, prefetchSpeak, speak } from '@/lib/audio'
import { useBack } from '@/lib/nav'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n'

/**
 * all = 今日队列（到期 + 新词）
 * due = 只复习到期的
 * early = 到期清空后，把最近要复习的提前过一遍
 */
type Mode = 'all' | 'due' | 'early'

/** 进入页面时拍一次快照：整轮学习不随答题实时重排 */
function buildFor(mode: Mode, deckId?: string | null): QueueItem[] {
  const st = useGame.getState()
  const decks = deckId ? [deckId] : st.settings.activeDecks
  if (mode === 'due') return dueItems(st.cards, decks)
  if (mode === 'early') return earlyItems(st.cards, decks)
  return buildQueue(st.cards, decks, st.settings.dailyGoal)
}

const RATINGS: { value: Rating; key: string; tone: string }[] = [
  { value: 1, key: 'learn.again', tone: 'rose' },
  { value: 2, key: 'learn.hard', tone: 'amber' },
  { value: 3, key: 'learn.good', tone: 'brand' },
  { value: 4, key: 'learn.easy', tone: 'mint' },
]

const TONE: Record<string, string> = {
  rose: 'border-[color-mix(in_srgb,var(--rose)_45%,transparent)] text-[var(--rose)] hover:bg-[color-mix(in_srgb,var(--rose)_12%,transparent)]',
  amber: 'border-[color-mix(in_srgb,var(--amber)_45%,transparent)] text-[var(--amber)] hover:bg-[color-mix(in_srgb,var(--amber)_12%,transparent)]',
  brand: 'border-[color-mix(in_srgb,var(--brand)_45%,transparent)] text-brand hover:bg-[color-mix(in_srgb,var(--brand)_12%,transparent)]',
  mint: 'border-[color-mix(in_srgb,var(--green)_45%,transparent)] text-[var(--green)] hover:bg-[color-mix(in_srgb,var(--green)_12%,transparent)]',
}

export default function Learn() {
  const t = useT()
  const navigate = useNavigate()
  const back = useBack('/')
  const [params] = useSearchParams()
  const raw = params.get('mode')
  const mode: Mode = raw === 'due' || raw === 'early' ? raw : 'all'
  const deckId = params.get('deck')
  const locale = useGame((s) => s.settings.uiLocale)
  const sound = useGame((s) => s.settings.sound)
  const activeDecks = useGame((s) => s.settings.activeDecks)
  const cards = useGame((s) => s.cards)
  const reviewWord = useGame((s) => s.reviewWord)

  /** 到期清空后还剩多少个能提前复习的：决定空态页给不给「提前复习」的入口 */
  const earlyLeft = useMemo(
    () => (mode === 'due' ? earlyItems(cards, activeDecks).length : 0),
    [mode, cards, activeDecks],
  )

  const [queue, setQueue] = useState<QueueItem[]>(() => buildFor(mode, deckId))
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const startRef = useRef(Date.now())
  const mounted = useRef(false)

  // 同一个路由内切换模式（例如从复习模式点回「学习」）时重开一轮
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    setQueue(buildFor(mode, deckId))
    setIdx(0)
    setRevealed(false)
    startRef.current = Date.now()
  }, [mode, deckId])

  const current = queue[idx]
  const word = current ? WORD_MAP[current.id] : undefined
  const cardState = current ? (cards[current.id] ?? newCard(current.id)) : undefined
  const finished = idx >= queue.length

  // 当前卡往后看两张，单词和例句的音频都提前拉下来：
  // 学生读题、想意思的这几秒足够下载完，点喇叭和翻到下一张时都不用等
  useEffect(() => {
    for (let k = idx; k < Math.min(idx + 3, queue.length); k++) {
      const w = WORD_MAP[queue[k].id]
      if (!w) continue
      prefetchSpeak(w.lemma, w.lang)
      if (w.example) prefetchSpeak(w.example, w.lang)
    }
  }, [idx, queue])

  const next = useCallback(() => {
    setLeaving(true)
    window.setTimeout(() => {
      setIdx((i) => i + 1)
      setRevealed(false)
      setLeaving(false)
      startRef.current = Date.now()
    }, 170)
  }, [])

  const grade = useCallback(
    (rating: Rating) => {
      if (!current) return
      if (!revealed && rating > 1) return
      reviewWord(current.id, rating, 'card', Date.now() - startRef.current)
      playSound(rating === 1 ? 'wrong' : rating === 4 ? 'combo' : 'correct', sound)
      next()
    },
    [current, revealed, reviewWord, sound, next],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setRevealed(true)
      }
      if (['1', '2', '3', '4'].includes(e.key)) {
        grade(Number(e.key) as Rating)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [grade, finished])

  const progress = queue.length ? idx / queue.length : 1

  if (finished) {
    const isReview = mode !== 'all'
    const title = isReview
      ? queue.length
        ? mode === 'early'
          ? t('learn.earlyDone')
          : t('learn.dueDone')
        : mode === 'early'
          ? t('learn.earlyEmpty')
          : t('learn.dueEmpty')
      : queue.length
        ? t('learn.done')
        : t('learn.empty')
    const desc = isReview
      ? queue.length
        ? mode === 'early'
          ? t('learn.earlyDoneDesc')
          : t('learn.dueDoneDesc')
        : mode === 'early'
          ? t('learn.earlyEmptyDesc')
          : t('learn.dueEmptyDesc')
      : queue.length
        ? t('learn.doneDesc')
        : t('learn.emptyDesc')
    return (
      <div className="mx-auto max-w-lg animate-pop pt-10 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-brand to-brand-2 text-white">
          <Check size={28} strokeWidth={2.5} />
        </div>
        <h1 className="mt-5 text-[20px] font-medium">{title}</h1>
        <p className="mt-2 text-[13px] text-ink-3">{desc}</p>
        <div className="mt-7 flex flex-col gap-2.5">
          {/* 到期清空了但还有没到期的词：给条路提前过一遍，而不是让人卡在空页上 */}
          {mode === 'due' && earlyLeft > 0 && (
            <Link to="/learn?mode=early" className="btn btn-primary">
              <RotateCcw size={16} />
              {t('home.reviewEarly')} · {earlyLeft}
            </Link>
          )}
          {mode === 'early' && (
            <Link to="/learn?mode=due" className="btn">
              <RotateCcw size={16} />
              {t('home.reviewNow')}
            </Link>
          )}
          {isReview && (
            <Link to="/learn" className={mode === 'due' && earlyLeft === 0 ? 'btn btn-primary' : 'btn'}>
              <Sparkles size={16} />
              {t('learn.continueNew')}
            </Link>
          )}
          <Link to="/games" className={isReview ? 'btn' : 'btn btn-primary'}>
            <Gamepad2 size={16} />
            {t('learn.goGames')}
          </Link>
          <Link to="/library" className="btn">
            <Library size={16} />
            {t('learn.goLibrary')}
          </Link>
        </div>
      </div>
    )
  }

  if (!word || !cardState || !current) return null

  return (
    <div className="mx-auto max-w-[620px]">
      <div className="mb-1 flex items-center gap-3">
        <button className="btn btn-ghost !px-2" onClick={back} aria-label={t('common.back')}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-ink-3">
            <span className="flex items-center gap-2">
              {t('learn.progress')}
              {mode !== 'all' && (
                <span
                  className={cn(
                    'rounded-md px-1.5 py-0.5 text-[10px]',
                    mode === 'due'
                      ? 'bg-[color-mix(in_srgb,var(--rose)_16%,transparent)] text-[var(--rose)]'
                      : 'bg-[color-mix(in_srgb,var(--brand)_16%,transparent)] text-brand',
                  )}
                >
                  {mode === 'due' ? t('learn.modeDue') : t('learn.modeEarly')}
                </span>
              )}
            </span>
            <span className="tnum">
              {idx + 1} / {queue.length}
            </span>
          </div>
          <Bar value={progress} />
        </div>
      </div>

      <div className="flex min-h-[62vh] items-center py-4">
        <div
          onClick={() => !revealed && setRevealed(true)}
          className={cn(
            'card relative w-full overflow-hidden p-7 transition-all duration-150 sm:p-9',
            !revealed && 'cursor-pointer',
            leaving ? 'translate-y-1 opacity-0' : 'animate-pop',
          )}
        >
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full opacity-30 blur-3xl"
            style={{ background: 'radial-gradient(circle, var(--brand), transparent 70%)' }}
          />

          <div className="relative">
            <div className="flex items-center gap-2">
              <span className="chip">
                {current.kind === 'new'
                  ? t('home.newWords')
                  : current.kind === 'weak'
                    ? t('home.weak')
                    : current.kind === 'early'
                      ? t('home.reviewEarly')
                      : t('home.due')}
              </span>
              {word.pos && <span className="chip">{word.pos}</span>}
              {cardState.reps > 0 && (
                <span className="ml-auto text-[11px] text-ink-3 tnum">
                  {t('learn.reps')} {cardState.reps}
                </span>
              )}
            </div>

            <div className="mt-8 text-center">
              <div className="flex items-center justify-center gap-3">
                <h1 className="text-[36px] font-medium leading-tight tracking-tight sm:text-[46px]">{word.lemma}</h1>
                <button
                  className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink-2 transition-colors hover:bg-[var(--surface-2)] hover:text-ink"
                  onClick={(e) => {
                    e.stopPropagation()
                    speak(word.lemma, word.lang)
                  }}
                  aria-label={t('learn.speak')}
                >
                  <Volume2 size={16} />
                </button>
              </div>
              {word.reading && <div className="mt-1.5 text-[15px] text-ink-2">{word.reading}</div>}
              {word.phonetic && <div className="mt-1 text-[13px] text-ink-3">{word.phonetic}</div>}
            </div>

            {!revealed ? (
              <div className="mt-9 flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--border)] py-7 text-ink-3">
                <span className="text-[13px]">{t('learn.reveal')}</span>
                <span className="text-[10.5px] opacity-70">space</span>
              </div>
            ) : (
              <div className="mt-7 animate-floatUp">
                <div className="text-center text-[23px] font-medium leading-snug">{word.zh}</div>
                {word.example ? (
                  <div className="mt-6 rounded-2xl bg-[var(--surface)] p-4">
                    <div className="text-[10.5px] uppercase tracking-wider text-ink-3">{t('learn.example')}</div>
                    <p className="mt-1.5 text-[14px] leading-relaxed">{word.example}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{word.exampleZh}</p>
                    <button
                      className="mt-2.5 inline-flex items-center gap-1.5 text-[11.5px] text-brand"
                      onClick={(e) => {
                        e.stopPropagation()
                        speak(word.example, word.lang)
                      }}
                    >
                      <Volume2 size={12} />
                      {t('learn.speak')}
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] px-4 py-3 text-center text-[11.5px] leading-relaxed text-ink-3">
                    {t('learn.noExample')}
                  </div>
                )}

                <div className="mt-6 grid grid-cols-4 gap-2">
                  {RATINGS.map((r) => (
                    <button
                      key={r.value}
                      onClick={(e) => {
                        e.stopPropagation()
                        grade(r.value)
                      }}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-[14px] border bg-transparent px-2 py-2.5 text-[12.5px] transition-colors',
                        TONE[r.tone],
                      )}
                    >
                      <span className="font-medium">{t(r.key)}</span>
                      <span className="text-[10px] text-ink-3 tnum">{intervalLabel(cardState, r.value, locale)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] text-ink-3">
        1 - 4 {locale === 'zh' ? '快速评级' : 'to rate'} · space {locale === 'zh' ? '翻面' : 'to reveal'} ·{' '}
        {ttsLocaleOf(word.lang)}
      </p>
    </div>
  )
}
