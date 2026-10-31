import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, RotateCcw, Timer, Zap } from 'lucide-react'
import type { GameRun, Word } from '@/data/types'
import { useGame } from '@/lib/store'
import { cn, shuffle } from '@/lib/utils'
import { playSound } from '@/lib/audio'
import { useT } from '@/i18n'
import { useBack } from '@/lib/nav'
import { gamePool, makeQuestions, questionFor, type Question } from '@/lib/quiz'

const BOSS_HP = 220
const HERO_HP = 100
const DURATION = 90

interface Floater {
  id: number
  text: string
  tone: 'dmg' | 'hurt'
  drift: number
}

export default function Boss() {
  const t = useT()
  const navigate = useNavigate()
  // 返回上一级（从首页星系或游戏列表进来都能原路退回）
  const back = useBack('/games')
  const sound = useGame((s) => s.settings.sound)
  const finishRun = useGame((s) => s.finishRun)

  const [phase, setPhase] = useState<'ready' | 'playing' | 'over'>('ready')
  const [bossHp, setBossHp] = useState(BOSS_HP)
  const [heroHp, setHeroHp] = useState(HERO_HP)
  const [time, setTime] = useState(DURATION)
  const [combo, setCombo] = useState(0)
  const [question, setQuestion] = useState<Question | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [hit, setHit] = useState(false)
  const [hurt, setHurt] = useState(false)
  const [floaters, setFloaters] = useState<Floater[]>([])
  const [result, setResult] = useState<GameRun | null>(null)
  const [won, setWon] = useState(false)
  const [best, setBest] = useState(0)

  const lockRef = useRef(false)
  const endedRef = useRef(false)
  const soundRef = useRef(sound)
  soundRef.current = sound

  const statsRef = useRef({
    bossHp: BOSS_HP,
    heroHp: HERO_HP,
    combo: 0,
    comboMax: 0,
    total: 0,
    correct: 0,
    damage: 0,
    answers: [] as { wordId: string; correct: boolean }[],
    startAt: 0,
    queue: [] as Question[],
    cursor: 0,
  })

  useEffect(() => {
    setBest(useGame.getState().runs.filter((r) => r.game === 'boss').reduce((m, r) => Math.max(m, r.score), 0))
  }, [])

  const pushFloater = useCallback((text: string, tone: 'dmg' | 'hurt') => {
    const id = Date.now() + Math.random()
    setFloaters((f) => [...f, { id, text, tone, drift: Math.round((Math.random() - 0.5) * 46) }])
    window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 900)
  }, [])

  const nextQuestion = useCallback(() => {
    const s = statsRef.current
    if (s.cursor >= s.queue.length) {
      const pool = s.queue.map((q) => q.word)
      s.queue = makeQuestions(shuffle(pool), pool, 20)
      s.cursor = 0
    }
    const q = s.queue[s.cursor++]
    setQuestion(q)
    setPicked(null)
    lockRef.current = false
  }, [])

  const endGame = useCallback(
    (win: boolean, timeUp = false) => {
      if (endedRef.current) return
      endedRef.current = true
      const s = statsRef.current
      const left = Math.max(0, DURATION - (Date.now() - s.startAt) / 1000)
      const bonus = win ? 80 + Math.round(left * 2) : 0
      const run: GameRun = {
        id: `run-${Date.now()}`,
        game: 'boss',
        score: Math.round(s.damage) + bonus,
        accuracy: s.total ? s.correct / s.total : 0,
        comboMax: s.comboMax,
        total: s.total,
        correct: s.correct,
        duration: Math.round((Date.now() - s.startAt) / 1000),
        at: Date.now(),
      }
      setWon(win)
      setResult(run)
      setPhase('over')
      finishRun(run, s.answers)
      playSound(win ? 'level' : 'wrong', soundRef.current)
      if (timeUp) setTime(0)
    },
    [finishRun],
  )

  const answer = useCallback(
    (index: number) => {
      if (lockRef.current || phase !== 'playing') return
      const q = question
      if (!q) return
      lockRef.current = true
      const s = statsRef.current
      const correct = index === q.answer
      s.total += 1
      setPicked(index)

      if (correct) {
        s.correct += 1
        s.combo += 1
        s.comboMax = Math.max(s.comboMax, s.combo)
        const base = 14 + Math.min(s.combo, 6) * 2
        const dmg = Math.round(q.elite ? base * 2 : base)
        s.damage += dmg
        s.bossHp = Math.max(0, s.bossHp - dmg)
        s.answers.push({ wordId: q.word.id, correct: true })
        setBossHp(s.bossHp)
        setCombo(s.combo)
        pushFloater(`-${dmg}`, 'dmg')
        setHit(true)
        window.setTimeout(() => setHit(false), 320)
        playSound(s.combo >= 5 && s.combo % 5 === 0 ? 'combo' : 'correct', soundRef.current)

        if (s.bossHp <= 0) {
          window.setTimeout(() => endGame(true), 520)
          return
        }
        window.setTimeout(() => {
          if (!endedRef.current) nextQuestion()
        }, 420)
      } else {
        s.combo = 0
        s.heroHp = Math.max(0, s.heroHp - 18)
        s.answers.push({ wordId: q.word.id, correct: false })
        setCombo(0)
        setHeroHp(s.heroHp)
        pushFloater('-18', 'hurt')
        setHurt(true)
        window.setTimeout(() => setHurt(false), 340)
        playSound('wrong', soundRef.current)

        if (s.heroHp <= 0) {
          window.setTimeout(() => endGame(false), 620)
          return
        }
        window.setTimeout(() => {
          if (!endedRef.current) nextQuestion()
        }, 1050)
      }
    },
    [phase, question, pushFloater, nextQuestion, endGame],
  )

  const start = useCallback(() => {
    const { seed, pool } = gamePool()
    const weak = Object.values(useGame.getState().cards)
      .filter((c) => c.lapses > 0)
      .map((c) => (seed.find((w) => w.id === c.wordId) ?? pool.find((w) => w.id === c.wordId)) as Word)
      .filter(Boolean)

    const queue = makeQuestions(shuffle(seed), pool, 40)
    if (weak.length) {
      for (let i = 4; i < queue.length; i += 5) {
        const w = weak[Math.floor(i / 5) % weak.length]
        if (w) queue[i] = questionFor(w, pool, true)
      }
    }

    statsRef.current = {
      bossHp: BOSS_HP,
      heroHp: HERO_HP,
      combo: 0,
      comboMax: 0,
      total: 0,
      correct: 0,
      damage: 0,
      answers: [],
      startAt: Date.now(),
      queue,
      cursor: 0,
    }
    endedRef.current = false
    lockRef.current = false
    setBossHp(BOSS_HP)
    setHeroHp(HERO_HP)
    setTime(DURATION)
    setCombo(0)
    setPicked(null)
    setFloaters([])
    setResult(null)
    setWon(false)
    setPhase('playing')
    nextQuestion()
  }, [nextQuestion])

  useEffect(() => {
    if (phase !== 'playing') return
    const id = window.setInterval(() => {
      const left = Math.max(0, DURATION - (Date.now() - statsRef.current.startAt) / 1000)
      setTime(Math.ceil(left))
      if (left <= 0) endGame(false, true)
    }, 200)
    return () => window.clearInterval(id)
  }, [phase, endGame])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'playing') return
      if (['1', '2', '3', '4'].includes(e.key)) answer(Number(e.key) - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, answer])

  const bossPct = bossHp / BOSS_HP
  const heroPct = heroHp / HERO_HP

  return (
    <div className="relative z-[2] flex h-full min-h-screen flex-col overflow-hidden bg-[var(--bg)]">
      <header className="flex items-center gap-3 px-4 pb-1 pt-4 sm:px-6">
        <button className="btn btn-ghost !px-2" onClick={back} aria-label={t('common.back')}>
          <ArrowLeft size={18} />
        </button>
        <span className="text-[13px] font-medium">{t('boss.title')}</span>
        <div className="ml-auto flex items-center gap-1 text-[12.5px] tnum">
          <Timer size={13} className={cn('text-ink-3', time <= 15 && 'text-[var(--rose)]')} />
          <span className={cn(time <= 15 && 'text-[var(--rose)]')}>{time}s</span>
        </div>
      </header>

      <div className="flex flex-1 flex-col justify-center px-4 pb-10 pt-2 sm:px-6">
        {/* Boss 区 */}
        <div className={cn('relative mx-auto w-full max-w-[520px]', hurt && 'animate-shake')}>
          <div className="flex items-center justify-between text-[10.5px] text-ink-3">
            <span className="flex items-center gap-1">
              遗忘恶魔
              {combo >= 3 && (
                <span className="ml-1 rounded-full bg-[color-mix(in_srgb,var(--amber)_18%,transparent)] px-1.5 py-0.5 text-[9.5px] text-[var(--amber)] tnum">
                  {combo} {t('falling.combo')}
                </span>
              )}
            </span>
            <span className="tnum">{bossHp}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${bossPct * 100}%`,
                background: 'linear-gradient(90deg, var(--rose), var(--amber))',
              }}
            />
          </div>

          <div className="relative mt-3 grid place-items-center">
            <span
              className="pointer-events-none absolute bottom-0 h-5 w-36 rounded-[50%]"
              style={{
                background: 'radial-gradient(ellipse at center, color-mix(in srgb, var(--rose) 55%, transparent), transparent 72%)',
                filter: 'blur(5px)',
              }}
            />
            <div
              className="pointer-events-none absolute h-44 w-44 rounded-full opacity-40 blur-2xl transition-opacity"
              style={{ background: 'radial-gradient(circle, var(--rose), transparent 70%)' }}
            />
            <svg
              width="136"
              height="136"
              viewBox="0 0 120 120"
              className={cn('relative transition-transform', hit && 'scale-95')}
              style={{ filter: 'drop-shadow(0 12px 26px rgba(255,107,138,0.28))' }}
            >
              <defs>
                <linearGradient id="bossBody" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--brand)" />
                  <stop offset="100%" stopColor="var(--rose)" />
                </linearGradient>
              </defs>
              <path
                d="M60 8c6 12 4 18 4 18 10-2 18 2 24 8 8 8 12 20 12 30 0 20-18 34-40 34S20 84 20 64c0-10 4-22 12-30 6-6 14-10 24-8 0 0-2-6 4-18Z"
                fill="url(#bossBody)"
                opacity="0.95"
              />
              <ellipse cx="45" cy="56" rx="8" ry="9" fill="#0B0E17" opacity="0.92" />
              <ellipse cx="75" cy="56" rx="8" ry="9" fill="#0B0E17" opacity="0.92" />
              <circle cx="47" cy="53" r="2.6" fill="#fff" opacity="0.9" />
              <circle cx="77" cy="53" r="2.6" fill="#fff" opacity="0.9" />
              <path
                d="M46 78l7-6 7 6 7-6 7 6"
                fill="none"
                stroke="#0B0E17"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.85"
              />
            </svg>

            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              {floaters.map((f) => (
                <span
                  key={f.id}
                  className={cn(
                    'animate-dmg absolute text-[20px] font-semibold tnum',
                    f.tone === 'dmg' ? 'text-[var(--amber)]' : 'text-[var(--rose)]',
                  )}
                  style={{ marginLeft: f.drift }}
                >
                  {f.text}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10.5px] text-ink-3">{t('boss.hero')}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${heroPct * 100}%`,
                  background: heroPct > 0.35 ? 'linear-gradient(90deg, var(--green), var(--brand-2))' : 'var(--rose)',
                }}
              />
            </div>
            <span className="text-[10.5px] text-ink-3 tnum">{heroHp}</span>
          </div>
        </div>

        {/* 题目区 */}
        <div className="mx-auto mt-5 w-full max-w-[520px]">
          <div className="card relative overflow-hidden px-5 py-6 text-center">
            {question?.elite && (
              <div className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-lg bg-[var(--amber)] px-2.5 py-0.5 text-[9.5px] font-medium text-[#1A1206]">
                {t('boss.elite')}
              </div>
            )}
            <div className="text-[26px] font-medium leading-tight sm:text-[30px]">{question?.word.lemma ?? '—'}</div>
            <div className="mt-1.5 text-[12px] text-ink-3">
              {question?.word.reading ?? question?.word.phonetic ?? ''}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {(question?.options ?? []).map((opt, i) => {
              const isAnswer = question ? i === question.answer : false
              const showRight = picked !== null && isAnswer
              const showWrong = picked === i && !isAnswer
              return (
                <button
                  key={opt.id}
                  data-opt={i}
                  onClick={() => answer(i)}
                  disabled={picked !== null}
                  className={cn(
                    'relative flex min-h-[62px] items-center justify-center rounded-2xl border px-3 py-2 text-center text-[13px] leading-snug transition-all duration-150',
                    !showRight && !showWrong && 'border-line bg-[var(--surface)] hover:border-brand/60',
                    showRight && 'border-[var(--green)] bg-[color-mix(in_srgb,var(--green)_18%,transparent)] text-[var(--green)]',
                    showWrong && 'border-[var(--rose)] bg-[color-mix(in_srgb,var(--rose)_18%,transparent)] text-[var(--rose)]',
                  )}
                >
                  <span className="pointer-events-none absolute left-2 top-1.5 text-[10px] text-ink-3">{i + 1}</span>
                  <span className="line-clamp-3">{opt.zh}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="h-4" />

      {phase === 'ready' && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-[var(--bg)] px-6">
          <button className="btn btn-ghost !absolute left-4 top-4 !px-2" onClick={back}>
            <ArrowLeft size={18} />
          </button>
          <div className="w-full max-w-sm animate-pop text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-gradient-to-br from-[var(--rose)] to-[var(--amber)] text-white">
              <Zap size={26} />
            </div>
            <h1 className="mt-5 text-[22px] font-medium">{t('boss.title')}</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-3">{t('boss.tip')}</p>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              <div className="card px-2 py-3">
                <div className="text-[17px] font-medium tnum">{BOSS_HP}</div>
                <div className="mt-1 text-[10.5px] text-ink-3">{t('boss.bossHp')}</div>
              </div>
              <div className="card px-2 py-3">
                <div className="text-[17px] font-medium tnum">{DURATION}s</div>
                <div className="mt-1 text-[10.5px] text-ink-3">{t('boss.limit')}</div>
              </div>
              <div className="card px-2 py-3">
                <div className="text-[17px] font-medium tnum">{best}</div>
                <div className="mt-1 text-[10.5px] text-ink-3">{t('result.score')}</div>
              </div>
            </div>
            <button className="btn btn-primary mt-6 w-full !py-3.5" onClick={start} data-act="start">
              <Play size={16} fill="currentColor" />
              {t('boss.start')}
            </button>
          </div>
        </div>
      )}

      {phase === 'over' && result && (
        <div className="absolute inset-0 z-10 grid place-items-center overflow-y-auto bg-[var(--bg)] px-6 py-8">
          <div className="w-full max-w-sm animate-pop">
            <div className="text-center">
              <div
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px]',
                  won
                    ? 'bg-[color-mix(in_srgb,var(--green)_16%,transparent)] text-[var(--green)]'
                    : 'bg-[var(--surface-2)] text-ink-2',
                )}
              >
                {won ? t('boss.win') : time <= 0 ? t('boss.timeUp') : t('boss.lose')}
              </div>
              <div className="mt-4 text-[46px] font-medium leading-none tnum">{result.score}</div>
              <div className="mt-1.5 text-[12px] text-ink-3">{t('result.score')}</div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              <div className="card px-2 py-3 text-center">
                <div className="text-[15px] font-medium tnum">{Math.round(result.accuracy * 100)}%</div>
                <div className="mt-1 text-[10px] text-ink-3">{t('result.accuracy')}</div>
              </div>
              <div className="card px-2 py-3 text-center">
                <div className="text-[15px] font-medium tnum">{result.comboMax}</div>
                <div className="mt-1 text-[10px] text-ink-3">{t('result.combo')}</div>
              </div>
              <div className="card px-2 py-3 text-center">
                <div className="text-[15px] font-medium tnum">{result.total}</div>
                <div className="mt-1 text-[10px] text-ink-3">{t('result.answered')}</div>
              </div>
            </div>

            <div className="mt-5 flex flex-col items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--brand)_16%,transparent)] px-3 py-1.5 text-[12.5px] font-medium text-brand tnum">
                <Zap size={12} />+{result.correct * 10 + Math.round(result.score / 10)} XP
              </span>
              <span className="text-[11.5px] text-ink-3">{t('result.reviewed')}</span>
            </div>

            <div className="mt-6 space-y-3">
              <button className="btn btn-primary w-full !py-3.5" onClick={start}>
                <RotateCcw size={16} />
                {t('result.again')}
              </button>
              <button className="btn w-full" onClick={() => navigate('/')}>
                {t('result.back')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
