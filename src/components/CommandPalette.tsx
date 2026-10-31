import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CornerDownLeft, Search, Sparkles, Volume2, X } from 'lucide-react'
import { searchWords } from '@/lib/search'
import { ensureAll } from '@/data/corpus'
import type { SearchHit } from '@/lib/search'
import { useGame } from '@/lib/store'
import { speak } from '@/lib/audio'
import { useT } from '@/i18n'
import { intervalLabel } from '@/lib/srs'

/** 打开搜索面板的全局事件名 */
export const OPEN_SEARCH = 'wq:open-search'

export function openSearch() {
  window.dispatchEvent(new CustomEvent(OPEN_SEARCH))
}

/** 把命中片段高亮出来 */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim()
  if (!q) return <>{text}</>
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-[rgba(var(--brand-rgb)/0.28)] px-0.5 text-[var(--text)]">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  )
}

export default function CommandPalette() {
  const t = useT()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [detail, setDetail] = useState<SearchHit | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const cards = useGame((s) => s.cards)
  const locale = useGame((s) => s.settings.uiLocale)

  const learnedIds = useMemo(() => new Set(Object.keys(cards)), [cards])

  const hits = useMemo(() => {
    if (!query.trim()) return []
    return searchWords(query, { limit: 24, learnedIds })
  }, [query, learnedIds])

  const show = useCallback(() => {
    // 搜索是全量语义的，先让后台把还没下载的词书补齐
    void ensureAll()
    setOpen(true)
    setDetail(null)
    setQuery('')
    setActive(0)
    setTimeout(() => inputRef.current?.focus(), 60)
  }, [])

  const hide = useCallback(() => {
    setOpen(false)
    setDetail(null)
    setQuery('')
  }, [])

  useEffect(() => {
    const onOpen = () => show()
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        show()
      }
    }
    window.addEventListener(OPEN_SEARCH, onOpen)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener(OPEN_SEARCH, onOpen)
      window.removeEventListener('keydown', onKey)
    }
  }, [show])

  useEffect(() => {
    setActive(0)
  }, [query])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (detail) setDetail(null)
        else hide()
        return
      }
      if (detail) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((i) => Math.min(i + 1, Math.max(0, hits.length - 1)))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        const hit = hits[active]
        if (hit) {
          e.preventDefault()
          setDetail(hit)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, hits, active, detail, hide])

  // 键盘选中项滚动到可视区
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  const card = detail ? cards[detail.word.id] : undefined

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/55 px-0 pt-0 backdrop-blur-[2px] sm:px-4 sm:pt-[9vh]">
      <button type="button" aria-label="close" className="absolute inset-0 cursor-default" onClick={hide} />

      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden border-line bg-[var(--bg-soft)] shadow-2xl sm:h-auto sm:max-h-[74vh] sm:max-w-[672px] sm:rounded-[22px] sm:border">
        {/* 输入 */}
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          {detail ? (
            <button
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-[var(--surface)] hover:text-[var(--text)]"
              onClick={() => setDetail(null)}
            >
              <ArrowLeft size={16} />
            </button>
          ) : (
            <Search size={17} className="shrink-0 text-ink-3" />
          )}
          {detail ? (
            <div className="min-w-0 flex-1 truncate text-[14px] font-medium">{detail.word.lemma}</div>
          ) : (
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search.placeholder')}
              className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-3"
              autoComplete="off"
              spellCheck={false}
            />
          )}
          <button
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-[var(--surface)] hover:text-[var(--text)]"
            onClick={hide}
          >
            <X size={16} />
          </button>
        </div>

        {/* 详情 */}
        {detail ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[26px] font-semibold leading-tight tracking-tight">{detail.word.lemma}</span>
                  {detail.word.phonetic && (
                    <span className="text-[13px] text-ink-3">/{detail.word.phonetic}/</span>
                  )}
                  {detail.word.reading && <span className="text-[12.5px] text-ink-3">{detail.word.reading}</span>}
                </div>
                <button
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-[var(--surface)] px-2.5 py-1 text-[11.5px] text-ink-2"
                  onClick={() => speak(detail.word.lemma, detail.word.lang)}
                >
                  <Volume2 size={12} />
                  {t('learn.speak')}
                </button>
              </div>
              {card && (
                <div className="shrink-0 rounded-xl border border-line bg-[var(--surface)] px-2.5 py-1.5 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-ink-3">{t('search.learned')}</div>
                  <div className="text-[12px] font-medium">{intervalLabel(card, 4, locale)}</div>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-line bg-[var(--surface)] px-3.5 py-3">
              <div className="text-[13.5px] leading-relaxed">{detail.word.zh}</div>
              {detail.word.example ? (
                <div className="mt-3 border-t border-line pt-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-ink-3">{t('learn.example')}</div>
                  <p className="mt-1 text-[13px] leading-relaxed">{detail.word.example}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-ink-3">{detail.word.exampleZh}</p>
                </div>
              ) : null}
            </div>

            {detail.deck && (
              <div className="mt-3 flex items-center justify-between rounded-2xl border border-line bg-[var(--surface)] px-3.5 py-2.5">
                <div className="min-w-0">
                  <div className="text-[10.5px] uppercase tracking-wider text-ink-3">{t('search.inDeck')}</div>
                  <div className="truncate text-[12.5px]">{detail.deck.title[locale]}</div>
                </div>
                <button
                  className="btn px-3 py-1.5 text-[12px]"
                  onClick={() => {
                    hide()
                    navigate(`/library?deck=${detail.deck!.id}`)
                  }}
                >
                  {t('search.goto')}
                </button>
              </div>
            )}

            <button
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-[rgba(var(--brand-rgb)/0.4)] bg-[rgba(var(--brand-rgb)/0.12)] px-3 py-2.5 text-[12.5px] text-[var(--brand)]"
              onClick={() => {
                hide()
                window.dispatchEvent(new CustomEvent('wq:ask-ai', { detail: `${detail.word.lemma} 是什么意思` }))
              }}
            >
              <Sparkles size={13} />
              {t('search.askAi')}
            </button>
          </div>
        ) : (
          <>
            {/* 结果 / 空态 */}
            <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {!query.trim() ? (
                <div className="px-3 py-8 text-center">
                  <div className="text-[12.5px] text-ink-2">{t('search.hint')}</div>
                  <div className="mt-1.5 text-[11px] text-ink-3">⌘K / Ctrl+K</div>
                </div>
              ) : hits.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <div className="text-[13px] text-ink-2">{t('search.empty')}</div>
                  <button
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-[rgba(var(--brand-rgb)/0.4)] bg-[rgba(var(--brand-rgb)/0.12)] px-3 py-1.5 text-[12px] text-[var(--brand)]"
                    onClick={() => {
                      hide()
                      window.dispatchEvent(new CustomEvent('wq:ask-ai', { detail: `${query} 是什么意思` }))
                    }}
                  >
                    <Sparkles size={12} />
                    {t('search.askAi')}
                  </button>
                </div>
              ) : (
                <>
                {hits[0]?.suggested && (
                  <div className="px-3 pb-1 pt-0.5 text-[10.5px] text-ink-3">{t('search.suggest')}</div>
                )}
                {hits.map((hit, i) => (
                  <button
                    key={hit.word.id + hit.word.deckId}
                    data-idx={i}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => setDetail(hit)}
                    className={
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ' +
                      (i === active ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface)]')
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="truncate text-[13.5px] font-medium">
                          <Highlight text={hit.word.lemma} query={query} />
                        </span>
                        {hit.word.phonetic && (
                          <span className="shrink-0 text-[10.5px] text-ink-3">/{hit.word.phonetic}/</span>
                        )}
                      </div>
                      <div className="truncate text-[11.5px] text-ink-3">
                        <Highlight text={hit.word.zh} query={query} />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {hit.deck && (
                        <div className="max-w-[120px] truncate text-[10.5px] text-ink-3">{hit.deck.title[locale]}</div>
                      )}
                      {cards[hit.word.id] && (
                        <div className="text-[10px] text-[var(--brand)]">{t('search.learned')}</div>
                      )}
                    </div>
                  </button>
                ))}
                </>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[10.5px] text-ink-3">
              <span>↑↓ 选择</span>
              <span className="inline-flex items-center gap-1">
                <CornerDownLeft size={10} />
                {t('search.goto')}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
