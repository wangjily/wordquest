import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Search, User, Volume2, X } from 'lucide-react'
import { DECKS, WORD_MAP } from '@/data'
import type { Deck } from '@/data/types'
import { CosmicField } from '@/components/CosmicField'
import { OrbitNav, type OrbitItem } from '@/components/OrbitNav'
import { buildQueue, deckProgress, levelOf, petStage, reviewTarget, summarize, useGame, weakWords } from '@/lib/store'
import { speak } from '@/lib/audio'
import { openSearch } from '@/components/CommandPalette'
import { cn } from '@/lib/utils'
import { pick, useT } from '@/i18n'

const isToday = (ts: number | null) => !!ts && new Date(ts).toDateString() === new Date().toDateString()

/** 距离下次复习的简短描述 */
function dueText(ts: number): string {
  const diff = ts - Date.now()
  if (diff <= 0) return '随时'
  const h = Math.round(diff / 3600000)
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}

type ReviewPlan = ReturnType<typeof reviewTarget>

/**
 * 复习入口的三种状态：
 * 到期 N 个 → 去复习；到期清空但还有学过的词 → 提前复习；一个学过的词都没有 → 灰掉并说明。
 * 以前这里只有前一种，清空后就变成一个点不动、也不解释的按钮。
 */
function ReviewCta({ plan, small }: { plan: ReviewPlan; small?: boolean }) {
  const t = useT()
  const cls = cn('cosmos-cta-ghost', small && '!py-3')
  if (plan.mode === 'none') {
    return (
      <span className={cls} data-off="true" aria-disabled="true" title={t('home.reviewNoneHint')}>
        {t('home.reviewNone')}
      </span>
    )
  }
  return (
    <Link to={plan.to} className={cls} title={plan.mode === 'early' ? t('home.earlyHint') : undefined}>
      {plan.mode === 'early' ? t('home.reviewEarly') : t('home.reviewNow')}
      <span className="tnum">· {plan.count}</span>
    </Link>
  )
}

export default function Home() {
  const t = useT()
  const locale = useGame((s) => s.settings.uiLocale)
  const profile = useGame((s) => s.profile)
  const settings = useGame((s) => s.settings)
  const cards = useGame((s) => s.cards)
  const logs = useGame((s) => s.logs)

  const activeDecks = settings.activeDecks
  const [peek, setPeek] = useState<string | null>(null)

  const deck: Deck = DECKS.find((d) => d.id === settings.activeDecks[0]) ?? DECKS[0]
  const prog = useMemo(() => deckProgress(cards, deck.id), [cards, deck.id])
  const sum = useMemo(() => summarize(cards, logs, settings.activeDecks), [cards, logs, settings.activeDecks])
  const queue = useMemo(
    () => buildQueue(cards, settings.activeDecks, settings.dailyGoal),
    [cards, settings.activeDecks, settings.dailyGoal],
  )
  const weak = useMemo(() => weakWords(cards, 4), [cards])
  const plan = useMemo(() => reviewTarget(cards, settings.activeDecks), [cards, settings.activeDecks])

  const due = sum.dueNow
  const newToday = useMemo(
    () => Object.values(cards).filter((c) => c.reps === 1 && isToday(c.lastReview)).length,
    [cards],
  )
  const goal = settings.dailyGoal
  const freshLeft = Math.max(0, goal - newToday)
  const minutes = Math.max(2, Math.round(((queue.length || goal) * 15) / 60))

  const level = levelOf(profile.xp)
  const pet = petStage(profile.petXp)
  const maxDay = Math.max(1, ...sum.last7.map((d) => d.count))

  const peekWord = peek ? WORD_MAP[peek] : null
  const peekState = peek ? cards[peek] : undefined

  /** 打游戏的那几个模式放后面，先让人把今天的词过完 */
  const otherModes: { to: string; label: string; desc?: string }[] = [
    { to: '/learn', label: t('home.modeCard') },
    { to: '/games/echo', label: t('games.echo.name') },
    { to: '/games/forge', label: t('games.forge.name') },
    { to: '/games/boss', label: t('games.boss.name') },
    { to: '/games/falling', label: t('games.falling.name') },
    { to: '/grammar', label: t('nav.grammar') },
    { to: '/library', label: t('nav.library') },
  ]

  /**
   * 星系外圈的模式入口。角度按屏幕坐标给，需要避让左侧标题的那几个
   * 特意压在 -148° / 150° 这种"偏高偏低"的位置上，而不是正左方。
   */
  const orbits = useMemo<OrbitItem[]>(() => {
    const tag = (s: string) => (locale === 'en' ? '' : s)
    return [
      { to: '/learn', name: t('orbit.card'), tag: tag('FLASHCARD'), a: -150, r: 0.98 },
      {
        to: plan.to,
        name: plan.mode === 'early' ? t('home.reviewEarly') : t('orbit.review'),
        tag: tag(plan.mode === 'early' ? 'EARLY' : 'REVIEW'),
        a: -96,
        r: 0.92,
        count: plan.count || undefined,
        quiet: plan.mode === 'none',
      },
      { to: '/games/echo', name: t('orbit.listen'), tag: tag('LISTENING'), a: -42, r: 1 },
      { to: '/games/forge', name: t('orbit.spell'), tag: tag('SPELLING'), a: 2, r: 0.98 },
      { to: '/grammar', name: t('orbit.grammar'), tag: tag('GRAMMAR'), a: 44, r: 0.92 },
      { to: '/games', name: t('nav.games'), tag: tag('GAMES'), a: 86, r: 0.96 },
      { to: '/library', name: t('orbit.library'), tag: tag('LIBRARY'), a: 148, r: 0.97 },
    ]
  }, [locale, t, plan])

  return (
    // 首页要通铺到屏幕边缘，抵消 Shell 的内容内边距
    <div className="-mx-4 -mt-5 sm:-mx-6 lg:-mt-8">
      <section className="cosmos-hero">
        <CosmicField className="cosmos-field" />

        <div className="cosmos-bar">
          <div className="cosmos-brand" data-orbit-safe>
            <b>{t('app.name')}</b>
            <span>WORDQUEST</span>
          </div>
          {/* 侧栏去掉之后，这两个是星系标签之外仅剩的常驻入口 */}
          <div className="cosmos-tools">
            <button type="button" onClick={openSearch} aria-label={t('search.title')}>
              <Search size={14} />
            </button>
            <Link to="/profile" aria-label={t('nav.profile')}>
              <User size={14} />
            </Link>
          </div>
        </div>

        <div className="cosmos-inner">
          <div className="cosmos-eyebrow" data-orbit-safe>
            <span className="cosmos-dot" />
            <span className="tnum">
              {t('home.newWords')} {freshLeft} · {minutes} {t('home.minutes')}
            </span>
          </div>

          <h1 className="cosmos-title" data-orbit-safe>
            {t('home.heroL1')}
            <br />
            <em>{t('home.heroL2')}</em>
          </h1>

          <p className="cosmos-lede" data-orbit-safe>{t('home.heroLede')}</p>

          {profile.streak > 0 && (
            <p className="mt-5 text-[10.5px] tracking-[0.08em] text-ink-3" data-orbit-safe>
              {t('home.streakBanner')} {profile.streak} {t('common.days')} · {t('home.streakKeep')}
            </p>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3" data-orbit-safe>
            <Link to="/learn" className="cosmos-cta">
              {queue.length === 0 ? t('home.playGame') : t('home.startLearn')}
              <span aria-hidden="true">→</span>
            </Link>
            <ReviewCta plan={plan} />
          </div>
        </div>

        {/* 星系外圈的模式入口，点一下就进去 */}
        <OrbitNav items={orbits} />

        <div className="cosmos-scroll">
          {t('home.queue')}
          <i />
        </div>
      </section>

      {/* 首屏以下：全部用细线清单，卡片只留给词书进度。
          宽屏改用左对齐，和首屏那列文字共享同一条左边线，不然会错开一百多像素 */}
      <div className="mx-auto max-w-[1120px] px-4 pb-4 sm:px-6 lg:mx-0 lg:max-w-[1240px] lg:px-10">
        <div className="ledger-head mt-12">
          <h2>{t('home.queue')}</h2>
          <Link to="/games">{t('home.queueAll')} →</Link>
        </div>
        <div className="ledger">
          <Link to={plan.to} className="ledger-row">
            <span className="idx">01</span>
            <span className="name">
              {plan.mode === 'due' ? t('home.modeDue') : plan.mode === 'early' ? t('home.reviewEarly') : t('home.modeDue')}
              <small>
                {plan.mode === 'due' ? t('home.dueDesc') : plan.mode === 'early' ? t('home.earlyDesc') : t('home.dueCleanNoDesc')}
              </small>
            </span>
            <span className="val">{plan.count}</span>
            <span className="arrow">→</span>
          </Link>
          <Link to="/learn" className="ledger-row">
            <span className="idx">02</span>
            <span className="name">
              {t('home.newWords')}
              <small>{t('home.newDesc')}</small>
            </span>
            <span className="val">{freshLeft}</span>
            <span className="arrow">→</span>
          </Link>
          <button
            type="button"
            className="ledger-row w-full text-left"
            onClick={() => {
              const first = weak[0]
              if (first) setPeek(first.wordId)
              else openSearch()
            }}
          >
            <span className="idx">03</span>
            <span className="name">
              {t('home.weak')}
              <small>{t('home.weakDesc')}</small>
            </span>
            <span className="val">{weak.length}</span>
            <span className="arrow">→</span>
          </button>
        </div>

        <section className="deck-panel">
          <div className="deck-grid">
            <div className="min-w-0">
              <div className="text-[9.5px] uppercase tracking-[0.2em] text-ink-3">{t('home.currentDeck')}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <h2 className="truncate text-[19px] tracking-tight">{pick(deck.title, locale)}</h2>
                <Link to="/library" className="shrink-0 text-[11px] text-brand hover:opacity-80">
                  {t('home.changeDeck')} →
                </Link>
              </div>
              <div className="mt-5 h-[2px] w-full overflow-hidden rounded-full bg-[rgba(var(--ink-rgb)/0.13)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2 transition-[width] duration-700"
                  style={{ width: `${Math.round(prog.pct * 100)}%` }}
                />
              </div>
              <div className="mt-2.5 flex justify-between text-[10.5px] text-ink-3 tnum">
                <span>
                  {prog.learned} / {prog.total} {t('common.words')}
                </span>
                <span>{t('home.deckMeta')}</span>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link to="/learn" className="cosmos-cta !py-3 !text-[13px]">
                  {t('home.startLearn')} <span aria-hidden="true">→</span>
                </Link>
                <ReviewCta plan={plan} small />
              </div>
            </div>
            <div className="deck-pct">
              <b>{Math.round(prog.pct * 100)}</b>
              <span>%</span>
              <small>{t('home.completed')}</small>
            </div>
          </div>
        </section>

        <div className="ledger-head mt-14">
          <h2>{t('home.modesOther')}</h2>
        </div>
        <div className="ledger">
          {otherModes.map((m, i) => (
            <Link key={m.to + m.label} to={m.to} className="ledger-row">
              <span className="idx">{String(i + 1).padStart(2, '0')}</span>
              <span className="name">{m.label}</span>
              <span className="arrow">→</span>
            </Link>
          ))}
          <button type="button" className="ledger-row w-full text-left" onClick={openSearch}>
            <span className="idx">08</span>
            <span className="name">
              {t('home.searchRow')}
              <small>{t('home.searchRowDesc')}</small>
            </span>
            <Search size={13} className="shrink-0 text-ink-3" />
          </button>
        </div>

        <div className="ledger-head mt-14">
          <h2>{t('home.today')}</h2>
        </div>
        <div className="ledger">
          <Link to="/profile" className="ledger-row">
            <span className="idx">01</span>
            <span className="name">
              {t('home.pet')}
              <small>
                {pick(pet.name, locale)} · Lv.{level.level}
              </small>
            </span>
            <span className="val">{profile.xp} XP</span>
            <span className="arrow">→</span>
          </Link>
          <Link to="/profile" className="ledger-row">
            <span className="idx">02</span>
            <span className="name">
              {t('home.week')}
              <small>
                {t('home.streak')} {profile.streak} {t('common.days')}
              </small>
            </span>
            <span className="flex flex-none items-end gap-[3px]">
              {sum.last7.map((d, i) => (
                <i
                  key={d.key}
                  className={cn(
                    'block w-[3px] rounded-sm',
                    i === 6 ? 'bg-gradient-to-t from-brand to-brand-2' : 'bg-[rgba(var(--ink-rgb)/0.2)]',
                  )}
                  style={{ height: `${Math.max(4, (d.count / maxDay) * 16)}px` }}
                />
              ))}
            </span>
            <span className="val !w-9 text-right">{sum.todayCount}</span>
          </Link>
          <Link to="/library" className="ledger-row">
            <span className="idx">03</span>
            <span className="name">
              {t('library.current')}
              <small>
                {pick(deck.title, locale)}
                {due > 0 && (
                  <>
                    <span className="mx-1 opacity-40">·</span>
                    <span className="text-[var(--rose)]">
                      {due} {t('home.due')}
                    </span>
                  </>
                )}
              </small>
            </span>
            <span className="val">{Math.round(deckProgress(cards, deck.id).pct * 100)}%</span>
            <span className="arrow">→</span>
          </Link>
        </div>

      </div>

      {/* 单词速查 */}
      {peekWord && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4" onClick={() => setPeek(null)}>
          <div className="card-solid w-full max-w-[360px] animate-pop p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[19px] font-medium">{peekWord.lemma}</h3>
                  <button
                    onClick={() => speak(peekWord.lemma, peekWord.lang)}
                    aria-label={t('learn.speak')}
                    className="grid h-6 w-6 place-items-center rounded-full bg-[var(--surface-2)] text-ink-2"
                  >
                    <Volume2 size={12} />
                  </button>
                </div>
                <div className="mt-1 text-[11px] text-ink-3">
                  {peekWord.phonetic ?? peekWord.reading} {peekWord.pos ? `· ${peekWord.pos}` : ''}
                </div>
              </div>
              <button
                onClick={() => setPeek(null)}
                aria-label={t('common.close')}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--surface-2)] text-ink-2"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mt-3 text-[13px]">{peekWord.zh}</div>

            {peekWord.example ? (
              <div className="mt-3 rounded-[12px] border border-line bg-[var(--surface)] p-3">
                <div className="text-[12px] leading-relaxed">{peekWord.example}</div>
                <div className="mt-1 text-[11px] text-ink-3">{peekWord.exampleZh}</div>
              </div>
            ) : null}

            <div className="mt-3 flex items-center justify-between text-[10.5px] text-ink-3">
              <span className="min-w-0 truncate">
                {pick(DECKS.find((d) => d.id === peekWord.deckId)?.title ?? { zh: '', en: '' }, locale)}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {peekState?.mastered ? (
                  <Check size={11} className="text-[var(--green)]" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
                )}
                {!peekState || peekState.state === 'new'
                  ? t('home.peekNew')
                  : peekState.mastered
                    ? t('home.peekMastered')
                    : `${t('home.peekNext')} ${dueText(peekState.due)}`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
