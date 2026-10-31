import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Check, CornerDownLeft, Loader2, Send, Sparkles, Trash2, X } from 'lucide-react'
import { answerLocally, buildSystemPrompt } from '@/lib/assistant'
import type { AssistantCard, AssistantQuiz, AssistantReply } from '@/lib/assistant'
import { askLLM, llmReady, loadLLM } from '@/lib/llm'
import type { ChatMessage } from '@/lib/llm'
import { useGame } from '@/lib/store'
import { speak } from '@/lib/audio'
import { useT } from '@/i18n'

interface Msg {
  id: string
  role: 'user' | 'ai'
  text: string
  cards?: AssistantCard[]
  actions?: { label: string; to: string }[]
  quiz?: AssistantQuiz
  streaming?: boolean
  offline?: boolean
}

const uid = () => Math.random().toString(36).slice(2, 9)

/** 极简 markdown：只处理 **粗体** 与换行 */
function RichText({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
        return (
          <span key={i} className="block">
            {parts.map((p, j) =>
              p.startsWith('**') && p.endsWith('**') ? (
                <strong key={j} className="font-semibold text-[var(--text)]">
                  {p.slice(2, -2)}
                </strong>
              ) : (
                <span key={j}>{p}</span>
              ),
            )}
            {line === '' ? '\u00A0' : null}
          </span>
        )
      })}
    </>
  )
}

export default function Assistant() {
  const t = useT()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [pendingQuiz, setPendingQuiz] = useState<AssistantQuiz | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const locale = useGame((s) => s.settings.uiLocale)

  const cfg = useMemo(() => loadLLM(), [open])
  const cloud = llmReady(cfg)

  useEffect(() => {
    if (!open) return
    setMessages((prev) =>
      prev.length
        ? prev
        : [{ id: uid(), role: 'ai', text: t('ai.greeting') }],
    )
    // 打开就把闲聊素材预取下来，免得第一次点「讲个笑话」还要等一下
    void import('@/lib/chat')
    setTimeout(() => inputRef.current?.focus(), 120)
  }, [open, t])

  // Esc 也能关：PC 端面板盖住右侧，光靠鼠标找按钮容易卡住
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // 搜索面板里点「问 AI」时，直接把问题送进来
  const sendRef = useRef<(v?: string) => void>(() => {})
  useEffect(() => {
    const onAsk = (e: Event) => {
      const q = (e as CustomEvent<string>).detail
      setOpen(true)
      setTimeout(() => sendRef.current(q), 80)
    }
    window.addEventListener('wq:ask-ai', onAsk)
    return () => window.removeEventListener('wq:ask-ai', onAsk)
  }, [])

  const suggestions = [
    t('ai.suggest.plan'),
    t('ai.suggest.weak'),
    t('ai.suggest.quiz'),
    t('ai.suggest.word'),
    t('ai.suggest.tip'),
    t('ai.suggest.joke'),
    t('ai.suggest.chat'),
  ]

  function pushLocal(reply: AssistantReply) {
    setMessages((prev) => [
      ...prev,
      {
        id: uid(),
        role: 'ai',
        text: reply.text,
        cards: reply.cards,
        actions: reply.actions,
        quiz: reply.quiz,
        offline: !cloud,
      },
    ])
    setPendingQuiz(reply.quiz ?? null)
    if (reply.apply?.dailyGoal) {
      useGame.getState().patchSettings({ dailyGoal: reply.apply.dailyGoal })
    }
  }

  async function send(raw?: string) {
    const text = (raw ?? input).trim()
    if (!text || busy) return
    setInput('')
    setBusy(true)

    const userMsg: Msg = { id: uid(), role: 'user', text }
    setMessages((prev) => [...prev, userMsg])

    const state = useGame.getState()
    const ctx = {
      locale: locale,
      cards: state.cards,
      logs: state.logs,
      settings: state.settings,
      pendingQuiz,
    }

    let localReply: AssistantReply
    try {
      localReply = await answerLocally(text, ctx)
    } catch {
      // 本地引擎挂了（比如换包后 chunk 404）也不能把面板卡在「发送中」
      localReply = { text: t('ai.localFail') }
    }

    if (!cloud) {
      setTimeout(() => {
        pushLocal(localReply)
        setBusy(false)
      }, 220)
      return
    }

    // 配了大模型的走真 LLM；失败就回退本地引擎
    const aiId = uid()
    setMessages((prev) => [...prev, { id: aiId, role: 'ai', text: '', streaming: true }])

    const history: ChatMessage[] = [
      { role: 'system', content: buildSystemPrompt(ctx) },
      ...messages
        .filter((m) => !m.streaming)
        .slice(-8)
        .map((m) => ({ role: m.role === 'ai' ? ('assistant' as const) : ('user' as const), content: m.text })),
      { role: 'user', content: text },
    ]

    try {
      const full = await askLLM(history, cfg, (delta) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === aiId ? { ...m, text: m.text + delta } : m)),
        )
      })
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId
            ? {
                ...m,
                text: full || localReply.text,
                streaming: false,
                cards: localReply.cards,
                quiz: localReply.quiz,
              }
            : m,
        ),
      )
      setPendingQuiz(localReply.quiz ?? null)
      if (localReply.apply?.dailyGoal) {
        useGame.getState().patchSettings({ dailyGoal: localReply.apply.dailyGoal })
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId
            ? { ...m, text: `${t('ai.llmFail')}\n${localReply.text}`, streaming: false, cards: localReply.cards, quiz: localReply.quiz, offline: true }
            : m,
        ),
      )
      setPendingQuiz(localReply.quiz ?? null)
    } finally {
      setBusy(false)
    }
  }

  sendRef.current = send

  // 消息里的动作有两种：真路由（/learn）和「再说一句」的魔术值（__joke__）
  function go(to: string) {
    if (to.startsWith('__')) {
      const magic: Record<string, string> = {
        __quiz__: t('ai.suggest.quiz'),
        __joke__: t('ai.suggest.joke'),
        __chat__: t('ai.suggest.chat'),
        __help__: t('ai.suggest.help'),
      }
      void send(magic[to] ?? t('ai.suggest.chat'))
      return
    }
    navigate(to)
    setOpen(false)
  }

  return (
    <>
      {/* 悬浮按钮：面板打开时收起，避免和面板里的关闭键重叠 */}
      {!open && (
      <button
        type="button"
        aria-label={t('ai.open')}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-[68px] right-3.5 z-40 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] text-white shadow-[0_12px_30px_-10px_rgba(124,92,255,0.7)] transition active:scale-95 lg:bottom-6 lg:right-6 lg:h-13 lg:w-13"
      >
        <Sparkles size={20} />
      </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/45 backdrop-blur-[2px] lg:items-stretch lg:bg-transparent lg:backdrop-blur-0">
          <button
            type="button"
            aria-label="close"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-[26px] border border-line bg-[var(--bg-soft)] shadow-2xl lg:m-4 lg:h-[calc(100dvh-32px)] lg:w-[412px] lg:rounded-[24px]">
            {/* 头部 */}
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] text-white">
                <Bot size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium">{t('ai.title')}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-ink-3">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: cloud ? '#3DDC97' : 'var(--text-3)' }}
                  />
                  {cloud ? t('ai.cloudOn') : t('ai.cloudOff')}
                </div>
              </div>
              <button
                className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-[var(--surface)] hover:text-[var(--text)]"
                title={t('ai.clear')}
                onClick={() => {
                  setMessages([])
                  setPendingQuiz(null)
                }}
              >
                <Trash2 size={15} />
              </button>
              <button
                className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-[var(--surface)] hover:text-[var(--text)]"
                aria-label={t('ai.close')}
                title={t('ai.close')}
                onClick={() => setOpen(false)}
              >
                <X size={17} />
              </button>
            </div>

            {/* 消息区 */}
            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m) => (
                <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={
                      m.role === 'user'
                        ? 'max-w-[86%] rounded-2xl rounded-br-md bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] px-3.5 py-2.5 text-[13px] leading-relaxed text-white'
                        : 'max-w-[92%] rounded-2xl rounded-bl-md border border-line bg-[var(--surface)] px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-2'
                    }
                  >
                    {m.role === 'ai' ? (
                      <>
                        {m.text ? <RichText text={m.text} /> : null}
                        {m.streaming && !m.text ? (
                          <span className="inline-flex items-center gap-1.5 text-ink-3">
                            <Loader2 size={12} className="animate-spin" />
                            {t('ai.thinking')}
                          </span>
                        ) : null}

                        {m.cards && m.cards.length > 0 && (
                          <div className="mt-2.5 space-y-1.5">
                            {m.cards.slice(0, 4).map((c) => (
                              <div
                                key={c.word.id}
                                className="flex items-center gap-2 rounded-xl border border-line bg-[var(--bg-soft)] px-2.5 py-2"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="truncate text-[13px] font-medium text-[var(--text)]">{c.word.lemma}</span>
                                    {c.word.phonetic && (
                                      <span className="truncate text-[10.5px] text-ink-3">/{c.word.phonetic}/</span>
                                    )}
                                  </div>
                                  <div className="truncate text-[11.5px] text-ink-3">{c.word.zh}</div>
                                  {c.deck && (
                                    <div className="mt-0.5 truncate text-[10px] text-ink-3">{c.deck.title[locale]}</div>
                                  )}
                                </div>
                                <button
                                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-[var(--surface-2)] hover:text-[var(--brand)]"
                                  onClick={() => speak(c.word.lemma, c.word.lang)}
                                >
                                  <Send size={12} className="-rotate-45" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {m.quiz && (
                          <div className="mt-2.5 space-y-1.5">
                            {m.quiz.options.map((opt, i) => (
                              <button
                                key={i}
                                className="flex w-full items-center gap-2 rounded-xl border border-line bg-[var(--bg-soft)] px-2.5 py-2 text-left text-[12.5px] hover:border-[rgba(var(--brand-rgb)/0.5)]"
                                onClick={() => void send(String(i + 1))}
                              >
                                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[var(--surface-2)] text-[10.5px] text-ink-3">
                                  {i + 1}
                                </span>
                                <span className="truncate">{opt}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {m.actions && m.actions.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {m.actions.map((a) => (
                              <button
                                key={a.to + a.label}
                                className="inline-flex items-center gap-1 rounded-full border border-[rgba(var(--brand-rgb)/0.4)] bg-[rgba(var(--brand-rgb)/0.12)] px-2.5 py-1 text-[11.5px] text-[var(--brand)]"
                                onClick={() => go(a.to)}
                              >
                                <Check size={11} />
                                {a.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <RichText text={m.text} />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 快捷问题 */}
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    className="rounded-full border border-line bg-[var(--surface)] px-2.5 py-1 text-[11.5px] text-ink-2 hover:border-[rgba(var(--brand-rgb)/0.5)] hover:text-[var(--text)]"
                    onClick={() => void send(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* 输入区 */}
            <div className="border-t border-line p-3">
              <div className="flex items-end gap-2 rounded-2xl border border-line bg-[var(--surface)] px-3 py-2">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void send()
                    }
                  }}
                  placeholder={t('ai.placeholder')}
                  className="max-h-24 min-h-[22px] flex-1 resize-none bg-transparent text-[13px] leading-relaxed outline-none placeholder:text-ink-3"
                />
                <button
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] text-white disabled:opacity-40"
                  disabled={busy || !input.trim()}
                  onClick={() => void send()}
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
              <div className="mt-1.5 flex items-center justify-between px-1 text-[10.5px] text-ink-3">
                <span>{cloud ? t('ai.cloudOn') : t('ai.subtitle')}</span>
                <span className="inline-flex items-center gap-1">
                  <CornerDownLeft size={10} />
                  Enter
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
