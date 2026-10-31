import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AudioLines, Play, RotateCcw, Volume2, Zap } from 'lucide-react'
import type { GameRun } from '@/data/types'
import { useGame } from '@/lib/store'
import { cn, shuffle } from '@/lib/utils'
import { hasTTS, playSound, prefetchSpeak, speak } from '@/lib/audio'
import { useT } from '@/i18n'
import { useBack } from '@/lib/nav'
import { gamePool, makeQuestions, type Question } from '@/lib/quiz'

const ROUND_SIZE = 12
const RATES = [0.75, 0.95, 1.2]

export default function Echo() {
  const t = useT()
  const navigate = useNavigate()
  // 返回上一级（从首页星系或游戏列表进来都能原路退回）
  const back = useBack('/games')
  const sound = useGame((s) => s.settings.sound)
  const finishRun = useGame((s) => s.finishRun)

  const [phase, setPhase] = useState<'ready' | 'playing' | 'over'>('ready')
  const [queue, setQueue] = useState<Question[]>([])
  const [cursor, setCursor] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [rateIdx, setRateIdx] = useState(1)
  const [result, setResult] = useState<GameRun | null>(null)
  const [best, setBest] = useState(0)
  const [tts] = useState(() => hasTTS())

  const lockRef = useRef(false)
  const statsRef = useRef({
    total: 0,
    correct: 0,
    comboMax: 0,
    streak: 0,
    answers: [] as { wordId: string; correct: boolean }[],
    startAt: 0,
    score: 0,
  })

  const question = queue[cursor] ?? null

  useEffect(() => {
    setBest(useGame.getState().runs.filter((r) => r.game === 'echo').reduce((m, r) => Math.max(m, r.score), 0))
  }, [])

  const play = useCallback(
    (q: Question | null, idx = rateIdx) => {
      if (!q) return
      speak(q.word.lemma, q.word.lang, RATES[idx])
    },
    [rateIdx],
  )

  // 题目一出现就把音频拉下来，260ms 后自动播放时才不用等下载
  useEffect(() => {
    if (!question) return
    prefetchSpeak(question.word.lemma, question.word.lang)
  }, [question?.word.id])

  useEffect(() => {
    if (phase !== 'playing' || !question) return
    const id = window.setTimeout(() => play(question), 260)
    return () => window.clearTimeout(id)
    // 换题时自动播报一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, cursor, question?.word.id])

  const endGame = useCallback(() => {
    const s = statsRef.current
    const run: GameRun = {
      id: `run-${Date.now()}`,
      game: 'echo',
      score: s.score,
      accuracy: s.total ? s.correct / s.total : 0,
      comboMax: s.comboMax,
      total: s.total,
      correct: s.correct,
      duration: Math.round((Date.now() - s.startAt) / 1000),
      at: Date.now(),
    }
    setResult(run)
    setPhase('over')
    finishRun(run, s.answers)
    playSound('level', sound)
  }, [finishRun, sound])

  const answer = useCallback(
    (index: number) => {
      if (lockRef.current || phase !== 'playing') return
      const q = queue[cursor]
      if (!q) return
      lockRef.current = true
      const s = statsRef.current
      const correct = index === q.answer
      s.total += 1
      setPicked(index)

      if (correct) {
        s.correct += 1
        s.streak += 1
        s.comboMax = Math.max(s.comboMax, s.streak)
        const gain = 15 + Math.min(s.streak, 5) * 3
        s.score += gain
        s.answers.push({ wordId: q.word.id, correct: true })
        setScore(s.score)
        setCombo(s.streak)
        playSound(s.streak >= 4 ? 'combo' : 'correct', sound)
      } else {
        s.streak = 0
        s.answers.push({ wordId: q.word.id, correct: false })
        setCombo(0)
        playSound('wrong', sound)
      }

      window.setTimeout(
        () => {
          lockRef.current = false
          setPicked(null)
          if (cursor + 1 >= queue.length) endGame()
          else setCursor((c) => c + 1)
        },
        correct ? 620 : 1100,
      )
    },
    [phase, queue, cursor, sound, endGame],
  )

  const start = useCallback(() => {
    const { seed, pool } = gamePool()
    const list = makeQuestions(shuffle(seed), pool, ROUND_SIZE)
    statsRef.current = {
      total: 0,
      correct: 0,
      comboMax: 0,
      streak: 0,
      answers: [],
      startAt: Date.now(),
      score: 0,
    }
    lockRef.current = false
    setQueue(list)
    setCursor(0)
    setPicked(null)
    setScore(0)
    setCombo(0)
    setResult(null)
    setPhase('playing')
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'playing') return
      if (['1', '2', '3', '4'].includes(e.key)) answer(Number(e.key) - 1)
      if (e.key === 'r' || e.key === ' ') play(queue[cursor])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, answer, play, queue, cursor])

  return (
    <div className="relative z-[2] flex h-full min-h-screen flex-col overflow-hidden bg-[var(--bg)]">
      <header className="flex items-center gap-3 px-4 pb-2 pt-4 sm:px-6">
        <button className="btn btn-ghost !px-2" onClick={back} aria-label={t('common.back')}>
          <ArrowLeft size={18} />
        </button>
        <span className="text-[13px] font-medium">{t('echo.title')}</span>
        <div className="ml-auto flex items-center gap-3 text-[12px] tnum">
          {combo >= 2 && (
            <span className="rounded-full bg-[color-mix(in_srgb,var(--amber)_18%,transparent)] px-2 py-0.5 text-[10.5px] text-[var(--amber)]">
              {combo} {t('falling.combo')}
            </span>
          )}
          <span className="text-brand">{score}</span>
          <span className="text-ink-3">
            {Math.min(cursor + 1, queue.length)}/{queue.length || ROUND_SIZE}
          </span>
        </div>
      </header>

      {phase === 'playing' && question && (
        <div className="flex flex-1 flex-col justify-center px-4 pb-10 sm:px-6">
          <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center">
            <div className="flex flex-col items-center py-2">
              <button
                onClick={() => play(question)}
                className="relative grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-white shadow-[0_20px_50px_-18px_var(--brand)] transition-transform active:scale-95"
                aria-label={t('echo.replay')}
              >
                <span className="absolute inset-0 animate-glow rounded-full bg-brand/25 blur-xl" />
                <Volume2 size={40} className="relative" />
              </button>
              <p className="mt-5 text-[12px] text-ink-3">{tts ? t('echo.tip') : t('echo.noTTS')}</p>
              {!tts && (
                <p className="mt-1 text-[22px] font-medium">{question.word.reading ?? question.word.phonetic ?? question.word.lemma}</p>
              )}

              <div className="mt-4 flex items-center gap-1 rounded-full border border-line p-0.5">
                {RATES.map((r, i) => (
                  <button
                    key={r}
                    onClick={() => {
                      setRateIdx(i)
                      play(question, i)
                    }}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[10.5px] transition-colors',
                      i === rateIdx ? 'bg-[var(--surface-2)] text-ink' : 'text-ink-3',
                    )}
                  >
                    {i === 0 ? '0.75x' : i === 1 ? '1x' : '1.25x'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-2">
              {question.options.map((opt, i) => {
                const isAnswer = i === question.answer
                const showRight = picked !== null && isAnswer
                const showWrong = picked === i && !isAnswer
                return (
                  <button
                    key={opt.id}
                    data-opt={i}
                    onClick={() => answer(i)}
                    disabled={picked !== null}
                    className={cn(
                      'relative flex min-h-[64px] items-center justify-center rounded-2xl border px-3 py-2 text-center text-[13px] leading-snug transition-all duration-150',
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

            {picked !== null && picked !== question.answer && (
              <div className="mt-3 animate-pop text-center text-[12px] text-ink-3">
                {t('echo.answer')} <span className="font-medium text-ink">{question.word.lemma}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {phase === 'ready' && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-[var(--bg)] px-6">
          <button className="btn btn-ghost !absolute left-4 top-4 !px-2" onClick={back}>
            <ArrowLeft size={18} />
          </button>
          <div className="w-full max-w-sm animate-pop text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-gradient-to-br from-brand-2 to-brand text-white">
              <AudioLines size={26} />
            </div>
            <h1 className="mt-5 text-[22px] font-medium">{t('echo.title')}</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-3">{t('echo.tip')}</p>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              <div className="card px-2 py-3">
                <div className="text-[17px] font-medium tnum">{ROUND_SIZE}</div>
                <div className="mt-1 text-[10.5px] text-ink-3">{t('echo.questions')}</div>
              </div>
              <div className="card px-2 py-3">
                <div className="text-[17px] font-medium">3</div>
                <div className="mt-1 text-[10.5px] text-ink-3">{t('echo.speed')}</div>
              </div>
              <div className="card px-2 py-3">
                <div className="text-[17px] font-medium tnum">{best}</div>
                <div className="mt-1 text-[10.5px] text-ink-3">{t('result.score')}</div>
              </div>
            </div>
            {!tts && <p className="mt-4 text-[11.5px] text-[var(--amber)]">{t('echo.noTTS')}</p>}
            <button className="btn btn-primary mt-6 w-full !py-3.5" onClick={start} data-act="start">
              <Play size={16} fill="currentColor" />
              {t('echo.start')}
            </button>
          </div>
        </div>
      )}

      {phase === 'over' && result && (
        <div className="absolute inset-0 z-10 grid place-items-center overflow-y-auto bg-[var(--bg)] px-6 py-8">
          <div className="w-full max-w-sm animate-pop">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-2)] px-3 py-1 text-[11px] text-ink-2">
                {t('result.title')}
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
