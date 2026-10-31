import { ALL_WORDS, DECKS, WORD_MAP } from '@/data'
import type { Deck, Word } from '@/data'

/**
 * 词条检索。
 *
 * 目标是「输入什么都能命中」：
 * - 英文拼写：完全匹配 > 前缀 > 子串 > 子序列（fuzzy，容忍漏字母）
 * - 中文释义：直接包含
 * - 音标：去重音符号后包含
 * - 结果按「相关度 → 是否带例句 → 是否已学」排序
 *
 * 5.6 万词条线性扫描一次约 6–10ms，配合 120ms 防抖足够，不需要建倒排索引。
 */

export interface SearchHit {
  word: Word
  deck: Deck | undefined
  score: number
  /** 命中的字段，用于高亮 */
  matchedIn: 'lemma' | 'zh' | 'phonetic'
  /** 拼写纠错命中（原查询没搜到，这是最接近的词） */
  suggested?: boolean
}

const NEWS = DECKS

function deckOf(id: string): Deck | undefined {
  return NEWS.find((d) => d.id === id)
}

/** 去掉声调符号，方便输入 kouyu 命中考（kǒuyǔ）之类 */
function deburr(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const norm = (s: string) => deburr(s.toLowerCase().trim())

/** 是否只差一个字符（插/删/换/相邻交换），用于拼写纠错 */
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  let j = 0
  let edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1
      j += 1
      continue
    }
    edits += 1
    if (edits > 1) return false
    if (a.length > b.length) i += 1
    else if (a.length < b.length) j += 1
    else {
      // 相邻字母写反（recieve / receive）也算一次
      if (a[i] === b[j + 1] && a[i + 1] === b[j]) {
        i += 2
        j += 2
      } else {
        i += 1
        j += 1
      }
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}

/** 判断 needle 是否是 haystack 的子序列（容忍漏打、跳字母） */
function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0
  for (let j = 0; j < haystack.length && i < needle.length; j++) {
    if (haystack[j] === needle[i]) i++
  }
  return i === needle.length
}

/**
 * 给一个词打分。返回 0 表示不匹配。
 * 分数区间大致：1000（完全命中）→ 30（勉强 fuzzy）
 */
function scoreWord(q: string, w: Word): { score: number; matchedIn: SearchHit['matchedIn'] } {
  const lemma = norm(w.lemma)
  const zh = w.zh || ''
  const phon = norm(w.phonetic || '')
  const reading = w.reading || ''

  // —— 英文 / 外文拼写 ——
  if (lemma === q) return { score: 1000, matchedIn: 'lemma' }
  if (lemma.startsWith(q)) {
    // 越短的词排越前，避免 ab 命中 abbreviation 盖住 abandon
    return { score: 900 - Math.min(200, lemma.length - q.length), matchedIn: 'lemma' }
  }
  if (lemma.includes(q) && q.length >= 2) return { score: 700 - Math.min(200, lemma.length), matchedIn: 'lemma' }

  // 词形变化：-s / -ed / -ing / -ly 之类，输入原形也能找到变形
  if (q.length >= 3) {
    for (const suf of ['s', 'es', 'ed', 'ing', 'ly', 'er', 'est']) {
      if (lemma === q + suf) return { score: 850, matchedIn: 'lemma' }
    }
  }

  // —— 中文释义 ——
  if (zh && w.zh.includes(q)) {
    // 释义开头命中比中间命中更相关
    return { score: w.zh.startsWith(q) ? 620 : 560, matchedIn: 'zh' }
  }

  // —— 音标 / 假名 ——
  if (phon && phon.includes(q)) return { score: 480, matchedIn: 'phonetic' }
  if (reading && reading.includes(q)) return { score: 470, matchedIn: 'phonetic' }

  // —— 子序列 fuzzy：只接受首字母相同、长度接近的，否则 tableland 也会被 aband 命中 ——
  if (q.length >= 4 && lemma[0] === q[0] && lemma.length <= q.length * 2 && isSubsequence(q, lemma)) {
    return { score: 180, matchedIn: 'lemma' }
  }

  return { score: 0, matchedIn: 'lemma' }
}

export interface SearchOptions {
  limit?: number
  /** 只在这些词书里搜（词库页用） */
  deckIds?: string[]
  /** 已学过的词 id，用于排序加分 */
  learnedIds?: Set<string>
}

const cache = new Map<string, SearchHit[]>()
const CACHE_MAX = 80

/** 搜索词条。同一个词在多本词书里出现时只返回一条（优先有例句的）。 */
export function searchWords(rawQuery: string, opts: SearchOptions = {}): SearchHit[] {
  const q = norm(rawQuery)
  if (!q) return []
  const limit = opts.limit ?? 30
  const key = `${q}|${limit}|${opts.deckIds?.join(',') ?? '*'}`
  const cached = cache.get(key)
  if (cached) return cached

  const best = new Map<string, SearchHit>()

  for (const w of ALL_WORDS) {
    if (opts.deckIds && !opts.deckIds.includes(w.deckId)) continue
    const { score, matchedIn } = scoreWord(q, w)
    if (score <= 0) continue

    let s = score
    if (w.example) s += 40
    if (opts.learnedIds?.has(w.id)) s += 20

    const dedupeKey = `${w.lang}|${w.lemma.toLowerCase()}`
    const prev = best.get(dedupeKey)
    if (!prev || s > prev.score) {
      best.set(dedupeKey, { word: w, deck: deckOf(w.deckId), score: s, matchedIn })
    }
  }

  let out = [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit)

  // 一条都没搜到、且是纯字母时，做一次编辑距离为 1 的拼写纠错
  if (out.length === 0 && /^[a-z]{4,}$/.test(q)) {
    let bestWord: Word | null = null
    let bestLen = Infinity
    let bestPrefix = -1
    const seen = new Set<string>()
    for (const w of ALL_WORDS) {
      if (opts.deckIds && !opts.deckIds.includes(w.deckId)) continue
      const lemma = w.lemma.toLowerCase()
      if (lemma[0] !== q[0] || Math.abs(lemma.length - q.length) > 1) continue
      if (seen.has(lemma)) continue
      seen.add(lemma)
      if (!withinOneEdit(q, lemma)) continue
      // 共同前缀更长者优先（recieve → receive 而不是 relieve），其次更短、带例句的
      let cp = 0
      while (cp < q.length && cp < lemma.length && q[cp] === lemma[cp]) cp += 1
      const score = lemma.length * 10 - (w.example ? 5 : 0)
      if (cp > bestPrefix || (cp === bestPrefix && score < bestLen)) {
        bestPrefix = cp
        bestLen = score
        bestWord = w
      }
    }
    if (bestWord) {
      out = [{ word: bestWord, deck: deckOf(bestWord.deckId), score: 60, matchedIn: 'lemma', suggested: true }]
    }
  }

  if (cache.size > CACHE_MAX) cache.clear()
  cache.set(key, out)
  return out
}

/** 首页速查用：按 id 取词 */
export function wordById(id: string): Word | undefined {
  return WORD_MAP[id]
}

/** 词书检索（词库页搜书） */
export function searchDecks(rawQuery: string, locale: 'zh' | 'en'): Deck[] {
  const q = norm(rawQuery)
  if (!q) return DECKS
  return DECKS.filter((d) => {
    const hay = [d.title.zh, d.title.en, d.desc.zh, d.desc.en, d.examTag, d.series, d.level]
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  }).sort((a, b) => {
    const an = norm(a.title[locale]).startsWith(q) ? 0 : 1
    const bn = norm(b.title[locale]).startsWith(q) ? 0 : 1
    return an - bn
  })
}
