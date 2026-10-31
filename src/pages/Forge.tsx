import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Delete, Hammer, Lightbulb, Play, RotateCcw, Volume2 } from 'lucide-react'
import type { GameRun, Word } from '@/data/types'
import { useGame } from '@/lib/store'
import { cn, shuffle } from '@/lib/utils'
import { playSound, speak } from '@/lib/audio'
import { useT } from '@/i18n'
import { useBack } from '@/lib/nav'
import { gamePool, spellTarget } from '@/lib/quiz'

const ROUND_SIZE = 8
const HINTS = 3

interface Tile {
  id: number
  ch: string
  used: boolean
}

export default function Forge() {
  const t = useT()
  const navigate = useNavigate()
  // 返回上一级（从首页星系或游戏列表进来都能原路退回）
  const back = useBack('/games')
  const sound = useGame((s) => s.settings.sound)
  const finishRun = useGame((s) => s.finishRun)

  const [phase, setPhase] = useState<'ready' | 'playing' | 'over'>('ready')
  const [words, setWords] = useState<Word[]>([])
  const [cursor, setCursor] = useState(0)
  const [tiles, setTiles] = useState<Tile[]>([])
  const [slots, setSlots] = useState<(number | null)[]>([])
  const [hintsLeft, setHintsLeft] = useState(HINTS)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [feedback, setFeedback] = useState<'idle' | 'ok' | 'bad'>('idle')
  const [revealed, setRevealed] = useState(false)
  const [result, setResult] = useState<GameRun | null>(null)
  const [best, setBest] = useState(0)

  const poolRef = useRef<Word[]>([])
  const advanceRef = useRef<() => void>(() => {})
  const statsRef = useRef({
    total: 0,
    correct: 0,
    comboMax: 0,
    streak: 0,
    answers: [] as { wordId: string; correct: boolean }[],
    startAt: 0,
    wrongForWord: 0,
    hintsForWord: 0,
  })

  const word = words[cursor]
  const target = useMemo(() => (word ? spellTarget(word) : ''), [word])

  useEffect(() => {
    setBest(useGame.getState().runs.filter((r) => r.game === 'forge').reduce((m, r) => Math.max(m, r.score), 0))
  }, [])

  const deal = useCallback((w: Word) => {
    const chars = spellTarget(w).split('')
    const others = poolRef.current
      .filter((x) => x.id !== w.id && x.lang === w.lang)
      .flatMap((x) => spellTarget(x).split(''))
    const decoys = shuffle(others).slice(0, 2)
    const list = shuffle([...chars, ...decoys])
    setTiles(list.map((ch, i) => ({ id: i, ch, used: false })))
    setSlots(Array(chars.length).fill(null))
    setFeedback('idle')
    setRevealed(false)
    statsRef.current.wrongForWord = 0
    statsRef.current.hintsForWord = 0
  }, [])

  const endGame = useCallback(() => {
    const s = statsRef.current
    const run: GameRun = {
      id: `run-${Date.now()}`,
      game: 'forge',
      score: Math.max(0, Math.round(score)),
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
  }, [score, finishRun, sound])

  const nextWord = useCallback(() => {
    const next = cursor + 1
    if (next >= words.length) {
      endGame()
      return
    }
    setCursor(next)
    setCombo(0)
    deal(words[next])
  }, [cursor, words, deal, endGame])

  advanceRef.current = nextWord

  const onCorrect = useCallback(() => {
    const s = statsRef.current
    const bonus = Math.max(6, 22 - 6 * s.wrongForWord - 4 * s.hintsForWord)
    s.total += 1
    s.correct += 1
    s.streak += 1
    s.comboMax = Math.max(s.comboMax, s.streak)
    s.answers.push({ wordId: word.id, correct: true })
    setScore((v) => v + bonus)
    setCombo((c) => c + 1)
    setFeedback('ok')
    playSound('correct', sound)
    window.setTimeout(() => advanceRef.current(), 720)
  }, [word, sound])

  const onWrong = useCallback(() => {
    const s = statsRef.current
    s.wrongForWord += 1
    s.streak = 0
    setFeedback('bad')
    setCombo(0)
    playSound('wrong', sound)

    if (s.wrongForWord >= 2) {
      setSlots(Array(spellTarget(word).length).fill(null))
      setTiles((prev) => prev.map((x) => ({ ...x, used: true })))
      setRevealed(true)
      s.total += 1
      s.answers.push({ wordId: word.id, correct: false })
      window.setTimeout(() => advanceRef.current(), 1600)
      return
    }
    window.setTimeout(() => {
      setSlots(Array(spellTarget(word).length).fill(null))
      setTiles((prev) => prev.map((x) => ({ ...x, used: false })))
      setFeedback('idle')
    }, 640)
  }, [word, sound])

  const check = useCallback(
    (nextSlots: (number | null)[], source: Tile[]) => {
      if (nextSlots.some((x) => x === null)) return
      const guess = nextSlots.map((id) => source.find((x) => x.id === id)?.ch ?? '').join('')
      if (guess === spellTarget(word)) onCorrect()
      else onWrong()
    },
    [word, onCorrect, onWrong],
  )

  const place = useCallback(
    (tileId: number) => {
      if (phase !== 'playing' || feedback !== 'idle' || revealed) return
      const idx = slots.indexOf(null)
      if (idx < 0) return
      const tile = tiles.find((x) => x.id === tileId)
      if (!tile || tile.used) return
      const nextSlots = [...slots]
      nextSlots[idx] = tileId
      const nextTiles = tiles.map((x) => (x.id === tileId ? { ...x, used: true } : x))
      setSlots(nextSlots)
      setTiles(nextTiles)
      playSound('click', sound)
      check(nextSlots, nextTiles)
    },
    [phase, feedback, revealed, slots, tiles, sound, check],
  )

  const unplace = useCallback(
    (slotIndex: number) => {
      if (phase !== 'playing' || feedback !== 'idle' || revealed) return
      const tileId = slots[slotIndex]
      if (tileId === null) return
      const nextSlots = [...slots]
      nextSlots[slotIndex] = null
      setSlots(nextSlots)
      setTiles((prev) => prev.map((x) => (x.id === tileId ? { ...x, used: false } : x)))
      playSound('click', sound)
    },
    [phase, feedback, revealed, slots, sound],
  )

  const hint = useCallback(() => {
    if (phase !== 'playing' || feedback !== 'idle' || revealed || hintsLeft <= 0) return
    const idx = slots.indexOf(null)
    if (idx < 0) return
    const ch = target[idx]
    const tile = tiles.find((x) => !x.used && x.ch === ch)
    if (!tile) return
    setHintsLeft((v) => v - 1)
    statsRef.current.hintsForWord += 1
    const nextSlots = [...slots]
    nextSlots[idx] = tile.id
    const nextTiles = tiles.map((x) => (x.id === tile.id ? { ...x, used: true } : x))
    setSlots(nextSlots)
    setTiles(nextTiles)
    playSound('click', sound)
    check(nextSlots, nextTiles)
  }, [phase, feedback, revealed, hintsLeft, slots, tiles, target, sound, check])

  const backspace = useCallback(() => {
    if (revealed) return
    for (let i = slots.length - 1; i >= 0; i--) {
      if (slots[i] !== null) {
        unplace(i)
        return
      }
    }
  }, [slots, revealed, unplace])

  const start = useCallback(() => {
    const { seed, pool } = gamePool()
    poolRef.current = pool
    const list = shuffle(seed).slice(0, ROUND_SIZE)
    statsRef.current = {
      total: 0,
      correct: 0,
      comboMax: 0,
      streak: 0,
      answers: [],
      startAt: Date.now(),
      wrongForWord: 0,
      hintsForWord: 0,
    }
    setWords(list)
    setCursor(0)
    setScore(0)
    setCombo(0)
    setHintsLeft(HINTS)
    setResult(null)
    setPhase('playing')
    deal(list[0])
  }, [deal])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'playing') return
      if (e.key === 'Backspace') {
        e.preventDefault()
        backspace()
        return
      }
      if (e.key.length === 1) {
        const tile = tiles.find((x) => !x.used && x.ch.toLowerCase() === e.key.toLowerCase())
        if (tile) place(tile.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, tiles, place, backspace])

  const filledGuess = slots.map((id) => (id === null ? '' : (tiles.find((x) => x.id === id)?.ch ?? '')))
  return (
    <div className="relative z-[2] flex h-full min-h-screen flex-col overflow-hidden bg-[var(--bg)]">
      <header className="flex items-center gap-3 px-4 pb-2 pt-4 sm:px-6">
        <button className="btn btn-ghost !px-2" onClick={back} aria-label={t('common.back')}>
          <ArrowLeft size={18} />
        </button>
        <span className="text-[13px] font-medium">{t('forge.title')}</span>
        <div className="ml-auto flex items-center gap-3 text-[12px] text-ink-2 tnum">
          <span>
            {Math.min(cursor + 1, words.length)} / {words.length || ROUND_SIZE}
          </span>
          <span className="text-brand">{score}</span>
        </div>
      </header>

      {phase === 'playing' && word && (
        <div className="flex flex-1 flex-col justify-center px-4 pb-10 sm:px-6">
          <div className="mx-auto w-full max-w-[520px] animate-pop">
            <div className="card px-5 py-5 text-center">
              <div className="text-[11px] text-ink-3">{t('forge.task')}</div>
              <div className="mt-2 text-[24px] font-medium leading-tight sm:text-[28px]">{word.zh}</div>
              <div className="mt-2 flex items-center justify-center gap-2 text-[12px] text-ink-3">
                <span>{word.reading ?? word.phonetic ?? ''}</span>
                <button className="btn btn-ghost !p-1" onClick={() => speak(word.lemma, word.lang)} aria-label="speak">
                  <Volume2 size={14} />
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-end justify-center gap-2">
              {slots.map((id, i) => {
                const ch = revealed ? (target[i] ?? '') : filledGuess[i]
                return (
                  <button
                    key={i}
                    onClick={() => unplace(i)}
                    data-slot={i}
                    className={cn(
                      'grid h-12 min-w-[34px] place-items-center rounded-xl border px-1 text-[19px] font-medium transition-all',
                      ch
                        ? revealed
                          ? 'border-[var(--amber)] bg-[color-mix(in_srgb,var(--amber)_14%,transparent)] text-[var(--amber)]'
                          : feedback === 'bad'
                            ? 'border-[var(--rose)] bg-[color-mix(in_srgb,var(--rose)_16%,transparent)] text-[var(--rose)]'
                            : feedback === 'ok'
                              ? 'border-[var(--green)] bg-[color-mix(in_srgb,var(--green)_16%,transparent)] text-[var(--green)]'
                              : 'border-brand/60 bg-[var(--surface-2)]'
                        : 'border-dashed border-line bg-[var(--surface)] text-ink-3',
                      feedback === 'bad' && 'animate-shake',
                    )}
                  >
                    {ch || ''}
                  </button>
                )
              })}
            </div>

            <div className="mt-7 flex flex-wrap justify-center gap-2">
              {tiles.map((tile) => (
                <button
                  key={tile.id}
                  onClick={() => place(tile.id)}
                  data-tile={tile.id}
                  disabled={tile.used}
                  className={cn(
                    'h-11 min-w-[38px] rounded-xl border px-2 text-[17px] font-medium transition-all',
                    tile.used
                      ? 'border-line/50 bg-transparent text-ink-3 opacity-25'
                      : 'border-line bg-[var(--surface)] hover:border-brand/60 active:scale-95',
                  )}
                >
                  {tile.ch}
                </button>
              ))}
            </div>

            {revealed && (
              <div className="mt-5 animate-pop text-center text-[13px]">
                <span className="text-ink-3">{t('forge.reveal')} </span>
                <span className="font-medium text-[var(--amber)]">{word.lemma}</span>
              </div>
            )}

            <div className="mt-8 flex items-center justify-center gap-2">
              <button className="btn" onClick={hint} disabled={hintsLeft <= 0 || revealed || feedback !== 'idle'}>
                <Lightbulb size={15} />
                {`${t('forge.hint')} ${hintsLeft}`}
              </button>
              <button className="btn btn-ghost" onClick={backspace} disabled={revealed}>
                <Delete size={15} />
                {t('forge.undo')}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'ready' && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-[var(--bg)] px-6">
          <button className="btn btn-ghost !absolute left-4 top-4 !px-2" onClick={back}>
            <ArrowLeft size={18} />
          </button>
          <div className="w-full max-w-sm animate-pop text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-gradient-to-br from-[var(--amber)] to-[var(--rose)] text-white">
              <Hammer size={26} />
            </div>
            <h1 className="mt-5 text-[22px] font-medium">{t('forge.title')}</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-3">{t('forge.tip')}</p>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              <div className="card px-2 py-3">
                <div className="text-[17px] font-medium tnum">{ROUND_SIZE}</div>
                <div className="mt-1 text-[10.5px] text-ink-3">{t('forge.words')}</div>
              </div>
              <div className="card px-2 py-3">
                <div className="text-[17px] font-medium tnum">{HINTS}</div>
                <div className="mt-1 text-[10.5px] text-ink-3">{t('forge.hint')}</div>
              </div>
              <div className="card px-2 py-3">
                <div className="text-[17px] font-medium tnum">{best}</div>
                <div className="mt-1 text-[10.5px] text-ink-3">{t('result.score')}</div>
              </div>
            </div>
            <button className="btn btn-primary mt-6 w-full !py-3.5" onClick={start} data-act="start">
              <Play size={16} fill="currentColor" />
              {t('forge.start')}
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
                <div className="text-[15px] font-medium tnum">{result.correct}</div>
                <div className="mt-1 text-[10px] text-ink-3">{t('forge.forged')}</div>
              </div>
              <div className="card px-2 py-3 text-center">
                <div className="text-[15px] font-medium tnum">{result.total}</div>
                <div className="mt-1 text-[10px] text-ink-3">{t('result.answered')}</div>
              </div>
            </div>

            <div className="mt-5 flex flex-col items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--brand)_16%,transparent)] px-3 py-1.5 text-[12.5px] font-medium text-brand tnum">
                +{result.correct * 10 + Math.round(result.score / 10)} XP
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
