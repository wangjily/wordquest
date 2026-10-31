import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, RotateCcw, Sparkles, X } from 'lucide-react'
import { GRAMMAR_TOTAL, GRAMMAR_TOPICS, type GrammarTopic } from '@/data/grammar'
import { useGame } from '@/lib/store'
import { cn } from '@/lib/utils'
import { pick, useT } from '@/i18n'

const KEY = 'wordquest-grammar-v1'

interface TopicRec {
  right: number
  total: number
  at: number
}

type Progress = { [id: string]: TopicRec }

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Progress
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* 隐私模式下写不进去，忽略 */
  }
}

/** 把题干里的 ___ 渲染成一道下划线空位 */
function Stem({ text }: { text: string }) {
  const parts = text.split('___')
  return (
    <p className="text-[17px] leading-[1.7] sm:text-[19px]">
      {parts.map((seg, i) => (
        <span key={i}>
          {seg}
          {i < parts.length - 1 && (
            <span className="mx-1.5 inline-block min-w-[52px] border-b-2 border-[var(--brand)] align-baseline opacity-70" />
          )}
        </span>
      ))}
    </p>
  )
}

function Runner({
  topic,
  onExit,
  onFinish,
}: {
  topic: GrammarTopic
  onExit: () => void
  onFinish: (right: number, total: number) => void
}) {
  const t = useT()
  const locale = useGame((s) => s.settings.uiLocale)
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [right, setRight] = useState(0)
  const [wrongs, setWrongs] = useState<{ i: number; k: number }[]>([])
  const [done, setDone] = useState(false)

  const total = topic.questions.length
  const q = topic.questions[i]

  const choose = (k: number) => {
    if (picked !== null) return
    setPicked(k)
    if (k === q.a) setRight((r) => r + 1)
    else setWrongs((w) => [...w, { i, k }])
  }

  const next = () => {
    if (i + 1 >= total) {
      setDone(true)
      onFinish(right, total)
      return
    }
    setI(i + 1)
    setPicked(null)
  }

  const restart = () => {
    setI(0)
    setPicked(null)
    setRight(0)
    setWrongs([])
    setDone(false)
  }

  if (done) {
    const pct = Math.round((right / total) * 100)
    const tone = pct === 100 ? 'perfect' : pct >= 70 ? 'good' : 'keep'
    return (
      <div className="mx-auto max-w-[600px] space-y-4">
        <div className="rounded-[20px] border border-line bg-[var(--surface)] p-7 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(var(--brand-rgb)/0.14)] px-3 py-1 text-[11.5px] text-brand">
            <Sparkles size={12} />
            {pick(topic.title, locale)}
          </div>
          <div className="mt-4 text-[44px] font-medium leading-none tnum">
            {right}
            <span className="text-[20px] text-ink-3"> / {total}</span>
          </div>
          <div className="mt-2 text-[13px] text-ink-2">{t(`grammar.${tone}`)}</div>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2 transition-[width] duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {wrongs.length > 0 && (
          <div className="rounded-[18px] border border-line bg-[var(--surface)] p-4 sm:p-5">
            <div className="mb-3 text-[12.5px] font-medium text-ink-2">{t('grammar.wrongList')}</div>
            <div className="space-y-3">
              {wrongs.map(({ i: qi, k }) => {
                const item = topic.questions[qi]
                return (
                  <div key={qi} className="border-t border-line pt-3 first:border-0 first:pt-0">
                    <div className="text-[13px] leading-relaxed">
                      {item.q.replace('___', item.opts[item.a])}
                    </div>
                    <div className="mt-1 text-[11.5px] text-ink-3">
                      <span className="text-[var(--rose)]">{item.opts[k]}</span>
                      <span className="mx-1.5">→</span>
                      <span className="text-[var(--green)]">{item.opts[item.a]}</span>
                    </div>
                    <div className="mt-1 text-[11.5px] leading-relaxed text-ink-3">{item.why}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2.5">
          <button onClick={onExit} className="btn h-12 flex-1">
            {t('grammar.backList')}
          </button>
          <button onClick={restart} className="btn btn-primary h-12 flex-1">
            <RotateCcw size={15} />
            {t('grammar.retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[660px] space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onExit} aria-label={t('grammar.backList')} className="btn btn-ghost !p-2">
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] text-ink-2">{pick(topic.title, locale)}</div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2 transition-[width] duration-300"
              style={{ width: `${((i + (picked !== null ? 1 : 0)) / total) * 100}%` }}
            />
          </div>
        </div>
        <span className="shrink-0 text-[12px] tnum text-ink-3">
          {i + 1} / {total}
        </span>
      </div>

      <div className="rounded-[20px] border border-line bg-[var(--surface)] p-5 sm:p-7">
        <div className="mb-3 text-[11px] uppercase tracking-wider text-ink-3">{topic.level}</div>
        <Stem text={q.q} />

        <div className="mt-5 grid gap-2.5">
          {q.opts.map((opt, k) => {
            const state = picked === null ? 'idle' : k === q.a ? 'right' : k === picked ? 'wrong' : 'dim'
            return (
              <button
                key={k}
                onClick={() => choose(k)}
                disabled={picked !== null}
                className={cn(
                  'flex items-center gap-3 rounded-[14px] border px-4 py-3 text-left text-[14px] transition-all',
                  state === 'idle' && 'border-line bg-[var(--surface-2)] hover:border-[rgba(var(--brand-rgb)/0.45)]',
                  state === 'right' && 'border-[var(--green)] bg-[rgba(var(--green-rgb)/0.12)] text-ink',
                  state === 'wrong' && 'border-[var(--rose)] bg-[rgba(var(--rose-rgb)/0.12)] text-ink',
                  state === 'dim' && 'border-line bg-transparent text-ink-3 opacity-55',
                )}
              >
                <span
                  className={cn(
                    'grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[10.5px] tnum',
                    state === 'idle' && 'border-line text-ink-3',
                    state === 'right' && 'border-transparent bg-[var(--green)] text-white',
                    state === 'wrong' && 'border-transparent bg-[var(--rose)] text-white',
                    state === 'dim' && 'border-line text-ink-3',
                  )}
                >
                  {state === 'right' ? <Check size={12} strokeWidth={3} /> : state === 'wrong' ? <X size={12} strokeWidth={3} /> : k + 1}
                </span>
                <span className="flex-1">{opt}</span>
              </button>
            )
          })}
        </div>
      </div>

      {picked !== null && (
        <div
          className={cn(
            'animate-pop rounded-[16px] border p-4',
            picked === q.a
              ? 'border-[rgba(var(--green-rgb)/0.5)] bg-[rgba(var(--green-rgb)/0.08)]'
              : 'border-[rgba(var(--rose-rgb)/0.5)] bg-[rgba(var(--rose-rgb)/0.08)]',
          )}
        >
          <div
            className="flex items-center gap-1.5 text-[12.5px] font-medium"
            style={{ color: picked === q.a ? 'var(--green)' : 'var(--rose)' }}
          >
            {picked === q.a ? <Check size={14} /> : <X size={14} />}
            {picked === q.a ? t('grammar.correct') : t('grammar.wrong')}
          </div>
          <div className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{q.why}</div>
        </div>
      )}

      <button onClick={next} disabled={picked === null} className="btn btn-primary h-12 w-full">
        {i + 1 >= total ? t('grammar.finish') : t('grammar.next')}
        <ArrowRight size={15} />
      </button>
    </div>
  )
}

export default function GrammarPage() {
  const t = useT()
  const locale = useGame((s) => s.settings.uiLocale)
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [active, setActive] = useState<GrammarTopic | null>(null)

  const finished = Object.keys(progress).length
  const avg = useMemo(() => {
    const list = Object.values(progress)
    if (!list.length) return 0
    return Math.round((list.reduce((s, r) => s + (r.total ? r.right / r.total : 0), 0) / list.length) * 100)
  }, [progress])

  if (active) {
    return (
      <Runner
        topic={active}
        onExit={() => setActive(null)}
        onFinish={(right, total) => {
          const next: Progress = { ...progress, [active.id]: { right, total, at: Date.now() } }
          setProgress(next)
          saveProgress(next)
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-medium tracking-tight sm:text-[26px]">{t('grammar.title')}</h1>
        <p className="mt-1 text-[13px] text-ink-3">{t('grammar.subtitle')}</p>
      </header>

      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: t('grammar.doneOf'), value: `${finished} / ${GRAMMAR_TOPICS.length}` },
          { label: t('grammar.questions'), value: String(GRAMMAR_TOTAL) },
          { label: t('grammar.accuracy'), value: `${avg}%` },
        ].map((s) => (
          <div key={s.label} className="rounded-[16px] border border-line bg-[var(--surface)] px-3 py-3">
            <div className="text-[17px] font-medium tnum">{s.value}</div>
            <div className="mt-0.5 text-[11px] text-ink-3">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {GRAMMAR_TOPICS.map((topic) => {
          const rec = progress[topic.id]
          const rate = rec && rec.total ? Math.round((rec.right / rec.total) * 100) : null
          return (
            <button
              key={topic.id}
              onClick={() => setActive(topic)}
              className="group relative overflow-hidden rounded-[18px] border border-line bg-[var(--surface)] p-4 text-left transition-colors hover:border-[rgba(var(--brand-rgb)/0.4)]"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium">{pick(topic.title, locale)}</div>
                  <div className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-ink-3">
                    {pick(topic.brief, locale)}
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] text-ink-3">
                  {topic.level}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2"
                    style={{ width: `${rate ?? 0}%` }}
                  />
                </div>
                <span className="shrink-0 text-[11px] tnum text-ink-3">
                  {rate === null ? `${topic.questions.length} ${t('grammar.questions')}` : `${rate}%`}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
