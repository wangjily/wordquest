/**
 * 已停用：首次访问直接进首页，用默认设置（CET-4 大纲词 + 每日 12 词）。
 * App.tsx 不再引用此文件，因此不会打进产物；保留是为了以后想恢复引导流程时直接接回去。
 *
 * 注意：如果哪天要恢复，先把下面这行改为在组件内部计算 ——
 * 它是模块级常量，DECKS 在语料索引到位前是空数组，会被算成空列表（线上引导页空白就是这个原因）：
 *   const PICKABLE = STAGES.filter((s) => DECKS.some((d) => d.stage === s.code))
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { DECKS, STAGES } from '@/data'
import type { Deck, Stage } from '@/data/types'
import { BookCover } from '@/components/BookCover'
import { useGame } from '@/lib/store'
import { cn } from '@/lib/utils'
import { pick, useT } from '@/i18n'

const GOALS = [
  { value: 8, zh: '轻松', en: 'Casual' },
  { value: 15, zh: '标准', en: 'Steady' },
  { value: 25, zh: '冲刺', en: 'Intense' },
]

/** 只展示真的有词书可选的阶段，避免选完落空 */
const PICKABLE = STAGES.filter((s) => DECKS.some((d) => d.stage === s.code))

function Mascot() {
  return (
    <svg width="76" height="76" viewBox="0 0 96 96" aria-hidden>
      <circle cx="26" cy="26" r="11" fill="#F6DFAE" />
      <circle cx="26" cy="26" r="6" fill="#EBC98D" />
      <circle cx="70" cy="26" r="11" fill="#F6DFAE" />
      <circle cx="70" cy="26" r="6" fill="#EBC98D" />
      <ellipse cx="48" cy="52" rx="30" ry="27" fill="#FBEBC8" />
      <ellipse cx="48" cy="62" rx="15" ry="11" fill="#FFF7E6" />
      <ellipse cx="38" cy="49" rx="3" ry="3.6" fill="#6B4A2F" />
      <ellipse cx="58" cy="49" rx="3" ry="3.6" fill="#6B4A2F" />
      <ellipse cx="48" cy="58" rx="3.4" ry="2.6" fill="#6B4A2F" />
      <ellipse cx="30" cy="59" rx="4.6" ry="3" fill="#F6B6A6" opacity="0.7" />
      <ellipse cx="66" cy="59" rx="4.6" ry="3" fill="#F6B6A6" opacity="0.7" />
      <g transform="rotate(-8 74 68)">
        <rect x="61" y="54" width="26" height="32" rx="4" fill="#FFFDF8" stroke="#E0C79B" strokeWidth="2" />
        <rect x="67" y="51" width="14" height="6" rx="3" fill="#E9C98F" />
        <line x1="67" y1="65" x2="81" y2="65" stroke="#DCC49B" strokeWidth="2" strokeLinecap="round" />
        <line x1="67" y1="72" x2="81" y2="72" stroke="#DCC49B" strokeWidth="2" strokeLinecap="round" />
        <line x1="67" y1="79" x2="76" y2="79" stroke="#DCC49B" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export default function Onboarding() {
  const t = useT()
  const navigate = useNavigate()
  const locale = useGame((s) => s.settings.uiLocale)
  const patch = useGame((s) => s.patchSettings)

  const [step, setStep] = useState<0 | 1>(0)
  const [stage, setStage] = useState<Stage | null>(null)
  const [deckId, setDeckId] = useState('')
  const [goal, setGoal] = useState(15)

  const pool = useMemo<Deck[]>(() => (stage ? DECKS.filter((d) => d.stage === stage) : []), [stage])
  const picked = DECKS.find((d) => d.id === deckId) ?? pool[0]

  const chooseStage = (code: Stage) => {
    setStage(code)
    const first = DECKS.find((d) => d.stage === code)
    setDeckId(first?.id ?? '')
  }

  const start = () => {
    const deck = DECKS.find((d) => d.id === deckId) ?? pool[0]
    patch({
      onboarded: true,
      targetLang: deck?.lang ?? 'en',
      activeDecks: deck ? [deck.id] : ['en-cet4'],
      dailyGoal: goal,
    })
    navigate('/learn')
  }

  return (
    <div className="relative z-[1] flex min-h-screen flex-col px-5 pb-7 pt-6">
      {/* 进度 */}
      <div className="flex items-center gap-3">
        <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2 transition-[width] duration-500"
            style={{ width: step === 0 ? '50%' : '100%' }}
          />
        </div>
        <button onClick={() => patch({ onboarded: true })} className="shrink-0 text-[12px] text-ink-3">
          {t('onboard.skip')}
        </button>
      </div>

      <div className="mx-auto w-full max-w-[460px] flex-1">
        {step === 0 ? (
          <div className="animate-pop">
            <div className="mt-6 flex items-start gap-2">
              <div className="shrink-0">
                <Mascot />
              </div>
              <div className="relative mt-2 flex-1 rounded-[16px] border border-line bg-[var(--surface)] px-4 py-3">
                <div className="absolute -left-[7px] top-5 h-3 w-3 rotate-45 border-b border-l border-line bg-[var(--surface)]" />
                <div className="text-[15.5px] font-semibold">{t('onboard.stageTitle')}</div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-2">{t('onboard.stageDesc')}</p>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-2.5">
              {PICKABLE.map((s) => (
                <button
                  key={s.code}
                  data-active={stage === s.code ? 'true' : 'false'}
                  onClick={() => chooseStage(s.code)}
                  className="pick-card h-[54px] rounded-[16px] text-[13.5px] font-medium"
                >
                  {pick(s.label, locale)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-pop">
            <div className="mt-6">
              <h1 className="text-[18px] font-semibold">{t('onboard.deck')}</h1>
              <p className="mt-1 text-[11.5px] text-ink-2">{t('onboard.deckDesc')}</p>
            </div>

            <div className="mt-3.5 grid gap-2">
              {pool.map((d) => {
                const active = picked?.id === d.id
                return (
                  <button
                    key={d.id}
                    data-active={active ? 'true' : 'false'}
                    onClick={() => setDeckId(d.id)}
                    className="pick-card relative flex items-center gap-3 rounded-[16px] p-3 text-left"
                  >
                    <BookCover deck={d} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-medium">{pick(d.title, locale)}</div>
                      <div className="mt-1 line-clamp-2 text-[11px] leading-[1.5] text-ink-3">
                        {pick(d.desc, locale)}
                      </div>
                    </div>
                    <span
                      className={cn(
                        'grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors',
                        active
                          ? 'border-transparent bg-gradient-to-br from-brand to-brand-2 text-white'
                          : 'border-line',
                      )}
                    >
                      {active && <Check size={12} strokeWidth={3} />}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-5">
              <div className="mb-2 text-[11.5px] text-ink-2">{t('onboard.goal')}</div>
              <div className="grid grid-cols-3 gap-2">
                {GOALS.map((g) => (
                  <button
                    key={g.value}
                    data-active={goal === g.value ? 'true' : 'false'}
                    onClick={() => setGoal(g.value)}
                    className="pick-card rounded-[14px] py-2.5"
                  >
                    <div className="text-[15.5px] font-medium tnum">{g.value}</div>
                    <div className="mt-0.5 text-[10.5px] text-ink-3">{pick(g, locale)}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="mx-auto mt-6 w-full max-w-[460px]">
        {step === 1 && (
          <button
            onClick={() => setStep(0)}
            className="mb-2.5 flex w-full items-center justify-center gap-1.5 py-1 text-[12px] text-ink-2"
          >
            <ArrowLeft size={13} />
            {t('onboard.back')}
          </button>
        )}
        <button
          onClick={() => (step === 0 ? setStep(1) : start())}
          disabled={step === 0 && !stage}
          className="btn btn-primary h-[50px] w-full !text-[14.5px]"
        >
          {step === 0 ? t('onboard.continue') : t('onboard.start')}
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}
