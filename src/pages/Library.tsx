import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Check, Circle, Search, Target, X } from 'lucide-react'
import { DECKS, STAGES, deckWords } from '@/data'
import { useDecksReady } from '@/data/corpus'
import type { Deck, Stage } from '@/data/types'
import { BookCover } from '@/components/BookCover'
import { Bar } from '@/components/ui'
import { deckProgress, dueItems, useGame } from '@/lib/store'
import { cn } from '@/lib/utils'
import { pick, useT } from '@/i18n'

const ALL = '__all'
type Sort = 'rec' | 'words' | 'progress'

const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches

export default function LibraryPage() {
  const t = useT()
  const navigate = useNavigate()
  const locale = useGame((s) => s.settings.uiLocale)
  const cards = useGame((s) => s.cards)
  const activeDecks = useGame((s) => s.settings.activeDecks)
  const setActiveDeck = useGame((s) => s.setActiveDeck)

  const [stage, setStage] = useState<Stage>(() => {
    const current = DECKS.find((d) => d.id === useGame.getState().settings.activeDecks[0])
    return current?.stage ?? 'junior'
  })
  const [series, setSeries] = useState<string>(ALL)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('rec')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheet, setSheet] = useState(false)

  /* ---------- 数据 ---------- */

  const dueMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const d of DECKS) map[d.id] = dueItems(cards, [d.id]).length
    return map
  }, [cards])

  const stageStats = useMemo(() => {
    const map = new Map<Stage, { decks: number; due: number; active: number }>()
    for (const s of STAGES) map.set(s.code, { decks: 0, due: 0, active: 0 })
    for (const d of DECKS) {
      const row = map.get(d.stage)
      if (!row) continue
      row.decks += 1
      if (activeDecks.includes(d.id)) {
        row.active += 1
        row.due += dueMap[d.id] ?? 0
      }
    }
    return map
  }, [activeDecks, dueMap])

  const totalDue = useMemo(
    () => activeDecks.reduce((sum, id) => sum + (dueMap[id] ?? 0), 0),
    [activeDecks, dueMap],
  )

  /** 同一时间只学一本，当前词书就是唯一那本 */
  const currentDeck = useMemo(() => DECKS.find((d) => d.id === activeDecks[0]) ?? DECKS[0], [activeDecks])

  const stageDecks = useMemo(() => DECKS.filter((d) => d.stage === stage), [stage])
  const seriesList = useMemo(
    () => [ALL, ...Array.from(new Set(stageDecks.map((d) => d.series)))],
    [stageDecks],
  )
  const effSeries = seriesList.includes(series) ? series : ALL

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    let out: Deck[]
    if (q) {
      out = DECKS.filter((d) =>
        `${d.title.zh}${d.title.en}${d.desc.zh}${d.desc.en}${d.series}${d.examTag}${d.level}`
          .toLowerCase()
          .includes(q),
      )
    } else {
      out = effSeries === ALL ? stageDecks : stageDecks.filter((d) => d.series === effSeries)
    }
    if (sort === 'words') return [...out].sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    if (sort === 'progress') {
      return [...out].sort((a, b) => deckProgress(cards, b.id).pct - deckProgress(cards, a.id).pct)
    }
    return out
  }, [query, stageDecks, effSeries, sort, cards])

  const current = useMemo(
    () => list.find((d) => d.id === selectedId) ?? list[0] ?? null,
    [list, selectedId],
  )

  // 详情面板要展示真实词条，选中哪本才加载哪本
  const currentReady = useDecksReady(current ? [current.id] : [])

  /** 只统计本词书的卡片：id 形如 `en-cet4-123`，注意 en-cet4 与 en-cet4-past 的前缀会互相污染 */
  const learnedOf = (deckId: string) => {
    const re = new RegExp(`^${deckId.replace(/[-.*+?^${}()|[\]\\]/g, '\\$&')}-\\d+$`)
    let n = 0
    for (const id of Object.keys(cards)) if (re.test(id)) n += 1
    return n
  }

  /** 其他学段的词书：分类下只有一两本时用来补充发现入口 */
  const suggestions = useMemo(
    () => DECKS.filter((d) => d.stage !== stage && !activeDecks.includes(d.id)).slice(0, 3),
    [stage, activeDecks],
  )

  /* ---------- 交互 ---------- */

  const patchStage = (code: Stage) => {
    setStage(code)
    setSeries(ALL)
    setQuery('')
    const first = DECKS.find((d) => d.stage === code)
    setSelectedId(first?.id ?? null)
  }

  const openDeck = (id: string) => {
    setSelectedId(id)
    if (!isDesktop()) setSheet(true)
  }

  /**
   * 换书是「替换」不是「追加」：以前这里是加入队列，选完高中仍然在背四级，
   * 因为学习队列按 activeDecks 的顺序取词。现在整组换成这一本，并把 deck 显式带到学习页兜底。
   */
  const startDeck = (deck: Deck) => {
    setActiveDeck(deck.id)
    setSheet(false)
    navigate(`/learn?deck=${deck.id}`)
  }

  const reviewDeck = (deck: Deck) => {
    setActiveDeck(deck.id)
    setSheet(false)
    navigate(`/learn?mode=due&deck=${deck.id}`)
  }

  useEffect(() => {
    if (!sheet) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheet(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheet])

  /* ---------- 词书详情（PC 侧栏 / 移动端抽屉共用） ---------- */

  const renderDetail = (deck: Deck) => {
    const prog = deckProgress(cards, deck.id)
    const due = dueMap[deck.id] ?? 0
    const active = activeDecks.includes(deck.id)
    // 词条可能还没下载，词数直接用索引里的规模；已学数按卡片统计
    const total = deck.count ?? prog.total
    const learned = total > prog.total ? learnedOf(deck.id) : prog.learned
    const pct = total ? learned / total : 0
    const samples = deckWords(deck.id).slice(0, 3)
    return (
      <div className="relative">
        <div
          className="pointer-events-none absolute -top-20 left-6 h-44 w-56 rounded-full opacity-25 blur-3xl"
          style={{ background: `radial-gradient(circle, ${deck.cover.from}, transparent 70%)` }}
        />
        <div className="relative p-4">
          <div className="flex gap-3.5">
            <BookCover deck={deck} size="lg" />
            <div className="min-w-0 flex-1 pt-1">
              <div className="text-[9.5px] font-medium uppercase tracking-[0.16em] text-ink-3">
                {deck.cover.label} · {deck.series}
              </div>
              <h2 className="mt-1.5 text-[15.5px] font-semibold leading-snug">{pick(deck.title, locale)}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="chip !py-1 !text-[10.5px]">{deck.level}</span>
                {active && (
                  <span className="rounded-full bg-[rgba(var(--green-rgb)/0.15)] px-2 py-[3px] text-[10px] font-medium text-[var(--green)]">
                    {t('library.added')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-2">{pick(deck.desc, locale)}</p>

          <div className="mt-3.5 grid grid-cols-3 divide-x divide-[var(--border)] rounded-[14px] border border-line bg-[var(--surface)] py-2.5">
            {[
              { v: total, l: t('library.total') },
              { v: learned, l: t('library.learned') },
              { v: due, l: t('home.due') },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="text-[16px] font-medium leading-none tnum">{s.v}</div>
                <div className="mt-1 text-[10px] text-ink-3">{s.l}</div>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between text-[10.5px] text-ink-3">
              <span>{t('library.progress')}</span>
              <span className="tnum">{Math.round(pct * 100)}%</span>
            </div>
            <Bar value={pct} />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.14em] text-ink-3">{t('library.preview')}</span>
            <span className="text-[10px] text-ink-3">{t('library.sampleNote')}</span>
          </div>
          <ul className="mt-1.5 space-y-1.5">
            {samples.length === 0 && (
              <li className="rounded-lg border border-dashed border-line px-2.5 py-2 text-[11px] text-ink-3">
                {currentReady ? t('library.sampleNote') : t('common.loading')}
              </li>
            )}
            {samples.map((w) => (
              <li key={w.id} className="flex items-baseline gap-2 text-[12px]">
                <span className="font-medium">{w.lemma}</span>
                <span className="shrink-0 text-[10px] text-ink-3">{w.phonetic ?? w.reading ?? ''}</span>
                <span className="ml-auto max-w-[45%] truncate text-ink-2">{w.zh}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex gap-2">
            <button className="btn btn-primary flex-1 !py-2.5 !text-[13px]" onClick={() => startDeck(deck)}>
              {/* 不是当前这本时，说清这一下会「换书」，而不是假装只是开始学习 */}
              {!active ? t('library.add') : learned > 0 ? t('library.resume') : t('library.start')}
            </button>
            <button
              onClick={() => setActiveDeck(deck.id)}
              aria-label={active ? t('library.added') : t('library.add')}
              className={cn(
                'btn !px-3 !py-2.5',
                active && '!border-[rgba(var(--green-rgb)/0.4)] !text-[var(--green)]',
              )}
            >
              {active ? <Check size={15} strokeWidth={2.6} /> : <Circle size={14} strokeWidth={2} />}
            </button>
          </div>

          {due > 0 && (
            <button
              onClick={() => reviewDeck(deck)}
              className="mt-2 w-full rounded-[12px] border border-line py-2 text-[11.5px] text-ink-2 transition-colors hover:border-[rgba(var(--rose-rgb)/0.45)] hover:text-[var(--rose)]"
            >
              {t('library.reviewFor')} {due} {t('common.words')}
            </button>
          )}
        </div>
      </div>
    )
  }

  /* ---------- 渲染 ---------- */

  return (
    <div className="paper -mx-4 -mt-5 min-h-[calc(100dvh-20px)] px-4 pb-24 pt-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:mt-0 lg:min-h-0 lg:px-0 lg:pb-0">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight">{t('library.pick')}</h1>
          <p className="mt-1 text-[11.5px] text-ink-3">
            {t('library.current')}{' '}
            <span className="text-ink-2">{pick(currentDeck.title, locale)}</span>
            <span className="mx-1 opacity-40">·</span>
            {DECKS.length} {t('library.booksTotal')}
            {totalDue > 0 && (
              <>
                <span className="mx-1 opacity-40">·</span>
                <span className="text-[var(--rose)]">
                  {totalDue} {t('home.due')}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {totalDue > 0 && (
            <button
              onClick={() => navigate('/learn?mode=due')}
              className="btn btn-primary shrink-0 !py-2 !text-[12px]"
            >
              <Target size={13} />
              {t('library.reviewNow')}
            </button>
          )}
          <label className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[12px] border border-line bg-[var(--surface)] px-2.5 py-2 transition-colors focus-within:border-[rgba(var(--brand-rgb)/0.5)] sm:w-[186px] sm:flex-none">
            <Search size={13} className="shrink-0 text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('library.filter')}
              className="w-full min-w-0 bg-transparent text-[12px] text-ink outline-none placeholder:text-ink-3"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label={t('common.cancel')}
                className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[var(--surface-2)] text-ink-2"
              >
                <X size={10} strokeWidth={3} />
              </button>
            )}
          </label>
        </div>
      </header>

      <div className="mt-4 lg:mt-6 lg:grid lg:grid-cols-[176px_minmax(0,1fr)_302px] lg:items-start lg:gap-5">
        {/* 学段导航 */}
        <aside className="lg:sticky lg:top-6">
          {/* 移动端：横向胶囊 */}
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 lg:hidden">
            {STAGES.map((s) => (
              <button
                key={s.code}
                data-active={stage === s.code && !query ? 'true' : 'false'}
                onClick={() => patchStage(s.code)}
                className="chip-btn shrink-0"
              >
                {pick(s.label, locale)}
              </button>
            ))}
          </div>

          {/* PC：竖排 */}
          <div className="card hidden p-1.5 lg:block">
            <div className="px-2 pb-1.5 pt-1 text-[9.5px] uppercase tracking-[0.16em] text-ink-3">
              {t('library.stage')}
            </div>
            {STAGES.map((s) => {
              const st = stageStats.get(s.code)
              return (
                <button
                  key={s.code}
                  data-active={stage === s.code && !query ? 'true' : 'false'}
                  onClick={() => patchStage(s.code)}
                  className="rail-item"
                >
                  <span className={cn('truncate', !st?.decks && 'opacity-45')}>{pick(s.label, locale)}</span>
                  <span className="ml-auto flex items-center gap-1.5">
                    {(st?.due ?? 0) > 0 && <span className="h-1.5 w-1.5 rounded-full bg-[var(--rose)]" />}
                    <span className="text-[10px] text-ink-3 tnum">{st?.decks ?? 0}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </aside>

        {/* 词书列表 */}
        <section className="mt-3 min-w-0 lg:mt-0">
          <div className="flex items-center justify-between gap-3">
            <div className="no-scrollbar -mx-4 flex min-w-0 gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:px-0">
              {!query && stageDecks.length > 0 ? (
                seriesList.map((s) => (
                  <button
                    key={s}
                    data-active={effSeries === s ? 'true' : 'false'}
                    onClick={() => setSeries(s)}
                    className="chip-btn shrink-0"
                  >
                    {s === ALL ? t('library.all') : s}
                  </button>
                ))
              ) : (
                <span className="text-[11.5px] text-ink-3">
                  {query ? `${t('library.search')}「${query}」· ${list.length} ${t('library.booksTotal')}` : ''}
                </span>
              )}
            </div>
            <div className="seg hidden shrink-0 lg:inline-flex">
              {(
                [
                  ['rec', t('library.sortRec')],
                  ['words', t('library.sortWords')],
                  ['progress', t('library.sortProg')],
                ] as [Sort, string][]
              ).map(([key, label]) => (
                <button key={key} data-active={sort === key ? 'true' : 'false'} onClick={() => setSort(key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div
            className={cn(
              'mt-3 grid gap-2 pb-14 lg:pb-0',
              list.length > 1 && 'xl:grid-cols-[repeat(2,minmax(0,1fr))]',
            )}
          >
            {list.map((deck) => {
              const prog = deckProgress(cards, deck.id)
              const active = activeDecks.includes(deck.id)
              const due = dueMap[deck.id] ?? 0
              return (
                <div
                  key={deck.id}
                  data-active={current?.id === deck.id ? 'true' : 'false'}
                  onClick={() => openDeck(deck.id)}
                  className="lib-row"
                >
                  {deck.isNew && (
                    <span className="absolute left-[50px] top-[-6px] rounded-[4px] bg-[#F4623A] px-1.5 py-[1px] text-[8.5px] font-semibold leading-[1.5] text-white shadow-[0_2px_6px_-2px_rgba(244,98,58,0.9)]">
                      NEW
                    </span>
                  )}
                  <BookCover deck={deck} size="sm" className="lg:h-[74px] lg:w-[53px]" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="truncate text-[13.5px] font-medium leading-snug">{pick(deck.title, locale)}</h2>
                      {active && (
                        <span className="shrink-0 rounded-[4px] bg-[rgba(var(--green-rgb)/0.15)] px-1 py-[1px] text-[9px] font-medium text-[var(--green)]">
                          {t('library.added')}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-3">{pick(deck.desc, locale)}</p>
                    <div className="mt-1.5 flex items-center gap-2 text-[10.5px] text-ink-3">
                      <span className="tnum">
                        {prog.total} {t('common.words')}
                      </span>
                      {prog.learned > 0 && (
                        <span className="tnum">
                          · {t('library.learned')} {prog.learned}
                        </span>
                      )}
                      <span className="ml-auto shrink-0 tnum text-ink-3">{Math.round(prog.pct * 100)}%</span>
                    </div>
                  </div>

                  {due > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        reviewDeck(deck)
                      }}
                      className="shrink-0 rounded-full bg-[rgba(var(--rose-rgb)/0.14)] px-2 py-[3px] text-[10px] font-medium text-[var(--rose)] tnum transition-opacity hover:opacity-80"
                    >
                      {due}
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveDeck(deck.id)
                    }}
                    aria-label={active ? t('library.added') : t('library.add')}
                    className={cn(
                      'grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-colors',
                      active
                        ? 'border-[rgba(var(--green-rgb)/0.45)] bg-[rgba(var(--green-rgb)/0.14)] text-[var(--green)]'
                        : 'border-line text-ink-2 hover:border-[rgba(var(--brand-rgb)/0.5)] hover:text-ink',
                    )}
                  >
                    {active ? <Check size={14} strokeWidth={2.6} /> : <Circle size={13} strokeWidth={2} />}
                  </button>
                </div>
              )
            })}
          </div>

          {list.length === 0 && (
            <div className="mt-8 flex flex-col items-center rounded-[18px] border border-dashed border-line py-10 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-line bg-[var(--surface)] text-brand">
                <BookOpen size={20} />
              </div>
              <div className="mt-3 text-[12.5px] font-medium">
                {query ? t('library.noResult') : t('library.empty')}
              </div>
              <p className="mt-1 max-w-[240px] text-[11px] leading-relaxed text-ink-3">
                {query ? t('library.noResultDesc') : t('library.emptyDesc')}
              </p>
            </div>
          )}

          {list.length > 0 && (
            <div className="mt-4 text-center text-[10.5px] text-ink-3 lg:text-left">
              {DECKS.length} {t('library.booksTotal')}
              <span className="mx-1 opacity-40">·</span>
              {t('library.switchHint')}
            </div>
          )}

          {/* PC：跨学段发现，避免分类里只有一两本时页面太单薄 */}
          {!query && suggestions.length > 0 && (
            <div className="mt-6 hidden lg:block">
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-[12px] font-medium text-ink-2">{t('library.more')}</h2>
                <span className="text-[10.5px] text-ink-3">{t('library.moreDesc')}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {suggestions.map((deck) => {
                  const stageLabel = STAGES.find((s) => s.code === deck.stage)
                  return (
                    <button
                      key={deck.id}
                      onClick={() => {
                        patchStage(deck.stage)
                        setSelectedId(deck.id)
                      }}
                      className="lib-row !gap-2.5 !p-2.5 text-left"
                    >
                      <span
                        className="h-9 w-[5px] shrink-0 rounded-full"
                        style={{ background: `linear-gradient(180deg, ${deck.cover.from}, ${deck.cover.to})` }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-medium">{pick(deck.title, locale)}</div>
                        <div className="mt-1 truncate text-[10px] text-ink-3">
                          {stageLabel ? pick(stageLabel.label, locale) : ''}
                          <span className="mx-1 opacity-50">·</span>
                          {deck.count ?? deckWords(deck.id).length} {t('common.words')}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        {/* PC 详情侧栏 */}
        <aside className="hidden lg:sticky lg:top-6 lg:block">
          <div className="card overflow-hidden">{current ? renderDetail(current) : null}</div>
        </aside>
      </div>

      {/* 移动端详情抽屉 */}
      {sheet && current && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/65" onClick={() => setSheet(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[88dvh] animate-pop overflow-y-auto rounded-t-[24px] border-t border-line bg-[var(--bg-soft)] pb-[calc(env(safe-area-inset-bottom,0px)+14px)]">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-[var(--bg-soft)] px-4 py-2.5">
              <span className="text-[12.5px] font-medium">{t('library.detail')}</span>
              <button
                onClick={() => setSheet(false)}
                aria-label={t('common.close')}
                className="grid h-7 w-7 place-items-center rounded-full bg-[var(--surface-2)] text-ink-2"
              >
                <X size={14} />
              </button>
            </div>
            {renderDetail(current)}
          </div>
        </div>
      )}
    </div>
  )
}
