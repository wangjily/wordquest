import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart, Play, RotateCcw, Timer, Trophy, Zap } from 'lucide-react'
import type { GameRun, Word } from '@/data/types'
import { buildQueue, useGame } from '@/lib/store'
import { WORD_MAP, wordsOfDecks } from '@/data'
import { cn, shuffle } from '@/lib/utils'
import { playSound } from '@/lib/audio'
import { useT } from '@/i18n'
import { useBack } from '@/lib/nav'

const DURATION = 60
const LIVES = 3

interface Question {
  word: Word
  options: Word[]
  answer: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  color: string
  size: number
}

interface Bubble {
  y: number
  w: number
  h: number
  speed: number
  phase: number
  lines: string[]
  fontSize: number
}

function makeQuestions(seedWords: Word[], pool: Word[], count: number): Question[] {
  const out: Question[] = []
  const base = seedWords.length ? seedWords : pool
  for (let i = 0; i < count; i++) {
    const word = base[i % base.length]
    const sameLang = pool.filter((w) => w.lang === word.lang && w.id !== word.id)
    const distractors = shuffle(sameLang).slice(0, 2)
    const options = shuffle([word, ...distractors])
    out.push({ word, options, answer: options.findIndex((o) => o.id === word.id) })
  }
  return out
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const ch of text) {
    const test = line + ch
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = ch
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

export default function Falling() {
  const t = useT()
  const navigate = useNavigate()
  // 返回上一级（从首页星系或游戏列表进来都能原路退回）
  const back = useBack('/games')
  const sound = useGame((s) => s.settings.sound)
  const finishRun = useGame((s) => s.finishRun)

  const [phase, setPhase] = useState<'ready' | 'playing' | 'over'>('ready')
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [lives, setLives] = useState(LIVES)
  const [time, setTime] = useState(DURATION)
  const [question, setQuestion] = useState<Question | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [shake, setShake] = useState(false)
  const [result, setResult] = useState<GameRun | null>(null)
  const [isRecord, setIsRecord] = useState(false)
  const [bestScore, setBestScore] = useState(0)

  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const sizeRef = useRef({ w: 0, h: 0 })
  const bubbleRef = useRef<Bubble | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const questionRef = useRef<Question | null>(null)
  const lockRef = useRef(false)
  const endedRef = useRef(false)
  const soundRef = useRef(sound)
  soundRef.current = sound

  const statsRef = useRef({
    score: 0,
    combo: 0,
    comboMax: 0,
    lives: LIVES,
    total: 0,
    correct: 0,
    answers: [] as { wordId: string; correct: boolean }[],
    startAt: 0,
    queue: [] as Question[],
    cursor: 0,
  })

  useEffect(() => {
    setBestScore(useGame.getState().runs.reduce((m, r) => Math.max(m, r.score), 0))
  }, [])

  const spawnBurst = useCallback((x: number, y: number, tone: 'good' | 'bad') => {
    const colors =
      tone === 'good' ? ['#7C5CFF', '#22D3EE', '#A78BFA', '#67E8F9'] : ['#FF6B8A', '#FF9EB1', '#FFB020']
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 60 + Math.random() * 220
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life: 0,
        max: 0.5 + Math.random() * 0.5,
        color: colors[i % colors.length],
        size: 2 + Math.random() * 3,
      })
    }
  }, [])

  const nextQuestion = useCallback(() => {
    const s = statsRef.current
    if (s.cursor >= s.queue.length) {
      const seed = shuffle(s.queue.map((q) => q.word))
      const st = useGame.getState()
      s.queue = makeQuestions(seed, wordsOfDecks(st.settings.activeDecks), 30)
      s.cursor = 0
    }
    const q = s.queue[s.cursor++]
    questionRef.current = q
    setQuestion(q)
    setPicked(null)
    lockRef.current = false

    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      const w = sizeRef.current.w || wrapRef.current?.clientWidth || 360
      const maxW = Math.min(w * 0.8, 330)
      const fontSize = w < 420 ? 16 : 18
      ctx.font = `500 ${fontSize}px system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`
      const lines = wrapText(ctx, q.word.zh, maxW - 44)
      const textW = Math.max(...lines.map((l) => ctx.measureText(l).width))
      bubbleRef.current = {
        y: -120,
        w: Math.min(Math.max(textW + 46, 150), maxW),
        h: lines.length * (fontSize + 10) + 34,
        speed: Math.min(56 + s.total * 3.4, 140),
        phase: Math.random() * Math.PI * 2,
        lines,
        fontSize,
      }
    }
  }, [])

  const endGame = useCallback(() => {
    if (endedRef.current) return
    endedRef.current = true
    cancelAnimationFrame(rafRef.current)
    const s = statsRef.current
    const run: GameRun = {
      id: `run-${Date.now()}`,
      game: 'falling',
      score: s.score,
      accuracy: s.total ? s.correct / s.total : 0,
      comboMax: s.comboMax,
      total: s.total,
      correct: s.correct,
      duration: Math.round((Date.now() - s.startAt) / 1000),
      at: Date.now(),
    }
    const prevBest = useGame.getState().runs.reduce((m, r) => Math.max(m, r.score), 0)
    setIsRecord(run.score > prevBest && run.score > 0)
    setResult(run)
    setPhase('over')
    finishRun(run, s.answers)
    playSound('level', soundRef.current)
  }, [finishRun])

  const answer = useCallback(
    (index: number) => {
      if (lockRef.current || phase !== 'playing') return
      const q = questionRef.current
      if (!q) return
      lockRef.current = true
      const s = statsRef.current
      const correct = index === q.answer
      s.total += 1

      if (correct) {
        s.correct += 1
        s.combo += 1
        s.comboMax = Math.max(s.comboMax, s.combo)
        const mult = 1 + Math.min(Math.floor(s.combo / 5), 3) * 0.5
        s.score += Math.round(10 * mult)
        s.answers.push({ wordId: q.word.id, correct: true })
        playSound(s.combo >= 5 && s.combo % 5 === 0 ? 'combo' : 'correct', soundRef.current)
        const b = bubbleRef.current
        if (b) spawnBurst(sizeRef.current.w / 2, b.y + b.h / 2, 'good')
        bubbleRef.current = null
      } else {
        s.combo = 0
        s.lives -= 1
        s.score = Math.max(0, s.score - 5)
        s.answers.push({ wordId: q.word.id, correct: false })
        playSound('wrong', soundRef.current)
        const bb = bubbleRef.current
        if (bb) spawnBurst(sizeRef.current.w / 2, bb.y + bb.h / 2, 'bad')
        bubbleRef.current = null
        setShake(true)
        window.setTimeout(() => setShake(false), 340)
      }

      setScore(s.score)
      setCombo(s.combo)
      setLives(s.lives)
      setPicked(index)

      if (s.lives > 0) {
        window.setTimeout(() => {
          if (!endedRef.current) nextQuestion()
        }, correct ? 380 : 1000)
      }
    },
    [phase, spawnBurst, nextQuestion],
  )

  const startGame = useCallback(() => {
    const st = useGame.getState()
    const queue = buildQueue(st.cards, st.settings.activeDecks, st.settings.dailyGoal)
    const pool = wordsOfDecks(st.settings.activeDecks)
    const queueWords = queue.map((q) => WORD_MAP[q.id]).filter(Boolean)
    const learned = Object.keys(st.cards).map((id) => WORD_MAP[id]).filter(Boolean)
    const seed = queueWords.length >= 6 ? queueWords : [...queueWords, ...learned].filter(Boolean)
    const source = seed.length >= 4 ? seed : pool

    statsRef.current = {
      score: 0,
      combo: 0,
      comboMax: 0,
      lives: LIVES,
      total: 0,
      correct: 0,
      answers: [],
      startAt: Date.now(),
      queue: makeQuestions(shuffle(source), pool, 40),
      cursor: 0,
    }
    particlesRef.current = []
    bubbleRef.current = null
    endedRef.current = false
    lockRef.current = false
    setScore(0)
    setCombo(0)
    setLives(LIVES)
    setTime(DURATION)
    setPicked(null)
    setResult(null)
    setIsRecord(false)
    setPhase('playing')
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return
    nextQuestion()
  }, [phase, nextQuestion])

  useEffect(() => {
    if (phase !== 'playing') return
    const id = window.setInterval(() => {
      const left = Math.max(0, DURATION - (Date.now() - statsRef.current.startAt) / 1000)
      setTime(Math.ceil(left))
      if (left <= 0) endGame()
    }, 200)
    return () => window.clearInterval(id)
  }, [phase, endGame])

  useEffect(() => {
    if (phase === 'playing' && lives <= 0) {
      const id = window.setTimeout(endGame, 620)
      return () => window.clearTimeout(id)
    }
  }, [lives, phase, endGame])

  useEffect(() => {
    if (phase !== 'playing') return
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !wrap || !ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      sizeRef.current = { w, h }
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    let last = performance.now()
    let elapsed = 0

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      elapsed += dt
      const { w, h } = sizeRef.current

      ctx.clearRect(0, 0, w, h)

      ctx.save()
      ctx.strokeStyle = 'rgba(124,92,255,0.09)'
      ctx.lineWidth = 1
      const gap = 44
      for (let y = (elapsed * 12) % gap; y < h; y += gap) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      ctx.restore()

      ctx.save()
      ctx.fillStyle = 'rgba(124,92,255,0.22)'
      for (let i = 0; i < 16; i++) {
        const px = ((i * 137.5 + 40) % Math.max(w - 60, 100)) + 30
        const py = ((i * 97 + elapsed * 16) % (h + 80)) - 40
        ctx.beginPath()
        ctx.arc(px, py, i % 3 === 0 ? 2 : 1.3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()

      ctx.save()
      ctx.setLineDash([5, 12])
      ctx.strokeStyle = 'rgba(255,255,255,0.055)'
      ctx.beginPath()
      ctx.moveTo(26, 0)
      ctx.lineTo(26, h)
      ctx.moveTo(w - 26, 0)
      ctx.lineTo(w - 26, h)
      ctx.stroke()
      ctx.restore()

      ctx.save()
      const dz = ctx.createLinearGradient(0, h - 140, 0, h)
      dz.addColorStop(0, 'rgba(255,107,138,0)')
      dz.addColorStop(1, 'rgba(255,107,138,0.12)')
      ctx.fillStyle = dz
      ctx.fillRect(0, h - 140, w, 140)
      ctx.restore()

      ctx.save()
      ctx.setLineDash([6, 8])
      ctx.strokeStyle = 'rgba(255,107,138,0.35)'
      ctx.beginPath()
      ctx.moveTo(16, h - 6)
      ctx.lineTo(w - 16, h - 6)
      ctx.stroke()
      ctx.restore()

      const b = bubbleRef.current
      if (b) {
        b.y += b.speed * dt
        if (b.y > h - b.h - 2) {
          answer(-1)
        }
        const danger = b.y > h * 0.62
        const x = w / 2 - b.w / 2 + Math.sin(elapsed * 1.7 + b.phase) * 12

        ctx.save()
        const grad = ctx.createLinearGradient(x, b.y, x + b.w, b.y + b.h)
        if (danger) {
          grad.addColorStop(0, 'rgba(255,107,138,0.97)')
          grad.addColorStop(1, 'rgba(255,176,32,0.92)')
        } else {
          grad.addColorStop(0, 'rgba(124,92,255,0.96)')
          grad.addColorStop(1, 'rgba(34,211,238,0.9)')
        }
        ctx.shadowColor = danger ? 'rgba(255,107,138,0.55)' : 'rgba(124,92,255,0.45)'
        ctx.shadowBlur = danger ? 28 : 20
        roundRect(ctx, x, b.y, b.w, b.h, 18)
        ctx.fillStyle = grad
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.strokeStyle = 'rgba(255,255,255,0.32)'
        ctx.lineWidth = 1
        roundRect(ctx, x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 17)
        ctx.stroke()

        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = `500 ${b.fontSize}px system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`
        const lh = b.fontSize + 10
        const startY = b.y + b.h / 2 - ((b.lines.length - 1) * lh) / 2
        b.lines.forEach((line, i) => {
          ctx.fillText(line, w / 2, startY + i * lh)
        })
        ctx.restore()
      }

      const ps = particlesRef.current
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i]
        p.life += dt
        if (p.life >= p.max) {
          ps.splice(i, 1)
          continue
        }
        p.vy += 520 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        const alpha = 1 - p.life / p.max
        ctx.globalAlpha = alpha
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [phase, answer])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'playing') return
      if (['1', '2', '3'].includes(e.key)) answer(Number(e.key) - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, answer])

  const comboTone = 1 + Math.min(Math.floor(combo / 5), 3) * 0.5
  const activeDecks = useGame((s) => s.settings.activeDecks)
  const poolSize = useMemo(() => wordsOfDecks(activeDecks).length, [activeDecks])

  return (
    <div className="relative z-[2] flex h-full min-h-screen flex-col overflow-hidden bg-[var(--bg)]">
      <header className="flex items-center gap-3 px-4 pb-2 pt-4 sm:px-6">
        <button className="btn btn-ghost !px-2" onClick={back} aria-label={t('common.back')}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-1.5 text-[13px] font-medium tnum">
          <Zap size={14} className="text-brand" />
          {score}
        </div>
        {combo >= 2 && (
          <div className="animate-pop rounded-full bg-[color-mix(in_srgb,var(--amber)_18%,transparent)] px-2 py-0.5 text-[11px] text-[var(--amber)] tnum">
            {combo} {t('falling.combo')} · {comboTone}x
          </div>
        )}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1 text-[12.5px] tnum">
            <Timer size={13} className={cn('text-ink-3', time <= 10 && 'text-[var(--rose)]')} />
            <span className={cn(time <= 10 && 'text-[var(--rose)]')}>{time}s</span>
          </div>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: LIVES }).map((_, i) => (
              <Heart
                key={i}
                size={13}
                className={cn(i < lives ? 'text-[var(--rose)]' : 'text-ink-3 opacity-40')}
                fill={i < lives ? 'currentColor' : 'none'}
              />
            ))}
          </div>
        </div>
      </header>

      <div ref={wrapRef} className={cn('relative flex-1', shake && 'animate-shake')}>
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>

      <div className="safe-b px-4 pb-4 sm:px-6">
        <div className="mx-auto grid max-w-[620px] grid-cols-3 gap-2">
          {(question?.options ?? []).map((opt, i) => {
            const isAnswer = question ? i === question.answer : false
            const showRight = picked !== null && isAnswer
            const showWrong = picked === i && !isAnswer
            return (
              <button
                key={opt.id}
                onClick={() => answer(i)}
                disabled={picked !== null}
                className={cn(
                  'relative flex h-[68px] items-center justify-center overflow-hidden rounded-2xl border px-2 text-center text-[13.5px] font-medium transition-all duration-150',
                  !showRight && !showWrong && 'border-line bg-[var(--surface)] hover:border-brand/60 hover:bg-[var(--surface-2)]',
                  showRight && 'border-[var(--green)] bg-[color-mix(in_srgb,var(--green)_18%,transparent)] text-[var(--green)]',
                  showWrong && 'border-[var(--rose)] bg-[color-mix(in_srgb,var(--rose)_18%,transparent)] text-[var(--rose)]',
                )}
              >
                <span className="pointer-events-none absolute left-2 top-1.5 text-[10px] text-ink-3">{i + 1}</span>
                <span className="line-clamp-2 leading-tight">{opt.lemma}</span>
              </button>
            )
          })}
        </div>
      </div>

      {phase === 'ready' && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-[var(--bg)] px-6">
          <button
            className="btn btn-ghost !absolute left-4 top-4 !px-2"
            onClick={back}
            aria-label={t('common.back')}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-full max-w-sm animate-pop text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-gradient-to-br from-brand to-brand-2 text-white">
              <Trophy size={26} />
            </div>
            <h1 className="mt-5 text-[22px] font-medium">{t('falling.title')}</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-3">{t('falling.tip')}</p>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              <div className="card px-2 py-3">
                <div className="text-[17px] font-medium tnum">{poolSize}</div>
                <div className="mt-1 text-[10.5px] text-ink-3">{t('common.words')}</div>
              </div>
              <div className="card px-2 py-3">
                <div className="text-[17px] font-medium tnum">{DURATION}s</div>
                <div className="mt-1 text-[10.5px] text-ink-3">{t('falling.time')}</div>
              </div>
              <div className="card px-2 py-3">
                <div className="text-[17px] font-medium tnum">{bestScore}</div>
                <div className="mt-1 text-[10.5px] text-ink-3">{t('result.score')}</div>
              </div>
            </div>
            <button className="btn btn-primary mt-6 w-full !py-3.5" onClick={startGame} disabled={poolSize < 4}>
              <Play size={16} fill="currentColor" />
              {t('falling.start')}
            </button>
            {poolSize < 4 && <p className="mt-3 text-[11.5px] text-[var(--rose)]">{t('games.needMore')}</p>}
          </div>
        </div>
      )}

      {phase === 'over' && result && (
        <div className="absolute inset-0 z-10 grid place-items-center overflow-y-auto bg-[var(--bg)] px-6 py-8">
          <div className="w-full max-w-sm animate-pop">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-2)] px-3 py-1 text-[11px] text-ink-2">
                {isRecord ? t('result.newRecord') : t('result.title')}
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
              <button className="btn btn-primary w-full !py-3.5" onClick={startGame}>
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
