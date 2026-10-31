import { useEffect, useSyncExternalStore } from 'react'
import type { Deck, Word } from './types'
import { ALL_WORDS, DECKS, rebuildIndex } from './index'

/**
 * 全量语料的加载器。
 *
 * 5.6 万词条共 3.8 MB，一次塞给首屏太亏：浏览器要下载 1.8 MB（gzip），
 * 而短词书用户其实只需要其中一本。所以语料按词书分片（public/corpus/），
 * 启动只拉 8 KB 的索引把书架渲染出来，词条按「谁在用谁加载」：
 *
 * - 进入学习 / 游戏：只加载 activeDecks 那几本（通常 200–600 KB）
 * - 打开搜索：后台补齐全量
 * - 其余页面：拿到索引即可显示词数与封面
 *
 * 加载完的片会 push 进 DECKS / ALL_WORDS（数组引用不变），version 自增触发重渲染。
 */

export type CorpusStatus = 'idle' | 'loading' | 'ready' | 'error'

const BASE = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL || '/'
const DIR = `${BASE}corpus/`

let status: CorpusStatus = 'idle'
let error: string | null = null
let version = 0
let bootPromise: Promise<void> | null = null
const listeners = new Set<() => void>()

const loaded = new Set<string>()
const failed = new Set<string>()
const inflight = new Map<string, Promise<void>>()

function emit() {
  version += 1
  for (const fn of listeners) fn()
}

export function corpusStatus(): CorpusStatus {
  return status
}
export function corpusError(): string | null {
  return error
}
export function corpusVersion(): number {
  return version
}
export function subscribeCorpus(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export function isDeckLoaded(id: string): boolean {
  return loaded.has(id)
}
export function loadedDeckCount(): number {
  return loaded.size
}

interface RawDeck {
  id: string
  lang: 'en' | 'ja' | 'es'
  title: { zh: string; en: string }
  level: string
  examTag: string
  desc: { zh: string; en: string }
  accent: Deck['accent']
  stage: Deck['stage']
  series: string
  cover: Deck['cover']
  count: number
}

interface RawIndex {
  v: number
  total: number
  decks: RawDeck[]
}

/** 固定位置：[lemma, phonetic, zh, reading, example, exampleZh, pos] */
type RawRow = string[]

function installIndex(raw: RawIndex) {
  DECKS.length = 0
  for (const d of raw.decks) {
    DECKS.push({
      id: d.id,
      lang: d.lang,
      title: d.title,
      level: d.level,
      examTag: d.examTag,
      desc: d.desc,
      accent: d.accent,
      stage: d.stage,
      series: d.series,
      cover: d.cover,
      count: d.count,
    })
  }
}

function installDeck(deckId: string, rows: RawRow[]) {
  const deck = DECKS.find((d) => d.id === deckId)
  if (!deck || (loaded.has(deckId) && !failed.has(deckId))) return
  failed.delete(deckId)

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const word: Word = {
      id: `${deckId}-${i}`,
      lang: deck.lang,
      deckId,
      lemma: r[0],
      phonetic: r[1] || undefined,
      zh: r[2] || '',
      reading: r[3] || undefined,
      example: r[4] || '',
      exampleZh: r[5] || '',
      pos: r[6] || undefined,
      freq: i,
    }
    ALL_WORDS.push(word)
  }
  loaded.add(deckId)
  rebuildIndex()
}

/** 加载单本词书的词条。low=true 时标记为低优先级，别跟首屏抢带宽 */
export function ensureDeck(deckId: string, opts: { low?: boolean } = {}): Promise<void> {
  if (loaded.has(deckId) && !failed.has(deckId)) return Promise.resolve()
  const running = inflight.get(deckId)
  if (running) return running

  const init: RequestInit & { priority?: 'high' | 'low' | 'auto' } = { cache: 'default' }
  if (opts.low) init.priority = 'low'

  const p = (async () => {
    try {
      const res = await fetch(`${DIR}${deckId}.json`, init)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const rows = (await res.json()) as RawRow[]
      installDeck(deckId, rows)
      emit()
    } catch (e) {
      // 单本失败不该拖住整个 App —— 早先是直接吞掉，结果这本书永远不算就绪，
      // 启动画面就永远停在那儿。现在标记失败并算作「不用等了」，页面照常进，
      // 下次有人 ensureDeck 时还会重试。
      failed.add(deckId)
      loaded.add(deckId)
      emit()
      console.warn(`词书 ${deckId} 加载失败`, e)
    } finally {
      inflight.delete(deckId)
    }
  })()

  inflight.set(deckId, p)
  return p
}

export async function ensureDecks(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => ensureDeck(id)))
}

/** 后台补齐全部词书（搜索需要）—— 3 路并发 + 低优先级 */
let allPromise: Promise<void> | null = null
export function ensureAll(): Promise<void> {
  if (allPromise) return allPromise
  allPromise = (async () => {
    const queue = DECKS.map((d) => d.id).filter((id) => !loaded.has(id) || failed.has(id))
    let cursor = 0
    const lane = async () => {
      while (cursor < queue.length) {
        const id = queue[cursor]
        cursor += 1
        await ensureDeck(id, { low: true })
      }
    }
    await Promise.all([lane(), lane(), lane()])
  })()
  return allPromise
}

/**
 * 空闲时补齐全量语料 —— 但必须避开首屏。
 *
 * 早先是「索引一到就在 idle 里拉 24 本共 1.8 MB」，弱网下这批请求会和
 * 首屏正在下的词书抢同一条管道，把一个 90 KB 的首屏拖成好几秒。
 * 现在改成：静置 12 秒，或者用户第一次动手之后 2.5 秒再开始。
 * 搜索框聚焦本身也会直接 ensureAll()，所以并不会漏。
 */
let warmArmed = false
export function armWarmup() {
  if (warmArmed) return
  warmArmed = true
  let fired = false
  const fire = () => {
    if (fired) return
    fired = true
    void ensureAll()
  }
  window.setTimeout(fire, 12000)
  window.addEventListener(
    'pointerdown',
    () => window.setTimeout(fire, 2500),
    { once: true },
  )
  window.addEventListener(
    'keydown',
    () => window.setTimeout(fire, 2500),
    { once: true },
  )
}

/** 启动：只拉索引，然后按优先级在后台补词条 */
export function bootCorpus(): Promise<void> {
  if (status === 'ready') return Promise.resolve()
  if (bootPromise) return bootPromise

  status = 'loading'
  emit()

  bootPromise = (async () => {
    try {
      // 索引会随词表更新，必须每次校验；不能 force-cache，否则换词表后用户拿不到新书
      const res = await fetch(`${DIR}index.json`, { cache: 'no-cache' })
      if (!res.ok) throw new Error(`词库索引加载失败（HTTP ${res.status}）`)
      const raw = (await res.json()) as RawIndex
      if (!raw || !Array.isArray(raw.decks)) throw new Error('词库格式不正确')
      installIndex(raw)
      status = 'ready'
      error = null
      emit()

      // 先保证在学的书可用；剩下的等页面静下来再说
      const active = readActiveDecks()
      if (active.length) void ensureDecks(active)
      armWarmup()
    } catch (e) {
      status = 'error'
      error = e instanceof Error ? e.message : String(e)
      emit()
    } finally {
      bootPromise = null
    }
  })()

  return bootPromise
}

/** 从持久化的 store 里读一次 activeDecks（避免 import 循环） */
function readActiveDecks(): string[] {
  try {
    const raw = localStorage.getItem('wordquest-v1')
    if (!raw) return []
    const parsed = JSON.parse(raw) as { state?: { settings?: { activeDecks?: string[] } } }
    const decks = parsed?.state?.settings?.activeDecks
    return Array.isArray(decks) ? decks : []
  } catch {
    return []
  }
}

/* ------------------------------ React hooks ------------------------------ */

export function useCorpusVersion(): number {
  return useSyncExternalStore(subscribeCorpus, corpusVersion, corpusVersion)
}

export function useCorpusStatus(): CorpusStatus {
  return useSyncExternalStore(subscribeCorpus, corpusStatus, corpusStatus)
}

/** 订阅版本 + 确保这些词书已加载，返回是否就绪 */
export function useDecksReady(ids: string[]): boolean {
  useCorpusVersion()
  const key = ids.join('|')
  useEffect(() => {
    if (!key) return
    for (const id of key.split('|')) void ensureDeck(id)
  }, [key])
  return ids.every(isDeckLoaded)
}
