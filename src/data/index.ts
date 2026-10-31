import type { Deck, LangCode, Stage, Word } from './types'

export * from './types'

/**
 * 词书与词条都由全量语料（public/corpus.json）在运行时注入，见 src/data/corpus.ts。
 * 这里只保留空容器 + 查询函数，好处是数组引用始终不变，各页面的 import 不用改。
 */
export const DECKS: Deck[] = []
export const ALL_WORDS: Word[] = []
export const WORD_MAP: Record<string, Word> = {}

export function rebuildIndex() {
  for (const k of Object.keys(WORD_MAP)) delete WORD_MAP[k]
  for (const w of ALL_WORDS) WORD_MAP[w.id] = w
}

/** 词库页顶部的一级分类，顺序即展示顺序 */
export const STAGES: { code: Stage; label: { zh: string; en: string } }[] = [
  { code: 'phonics', label: { zh: '自然拼读', en: 'Phonics' } },
  { code: 'primary', label: { zh: '小学', en: 'Primary' } },
  { code: 'junior', label: { zh: '初中', en: 'Junior' } },
  { code: 'senior', label: { zh: '高中', en: 'Senior' } },
  { code: 'cet4', label: { zh: '四级', en: 'CET-4' } },
  { code: 'cet6', label: { zh: '六级', en: 'CET-6' } },
  { code: 'postgrad', label: { zh: '考研考博', en: 'Postgrad' } },
  { code: 'abroad', label: { zh: '留学', en: 'Study abroad' } },
  { code: 'major', label: { zh: '英专', en: 'English major' } },
  { code: 'japanese', label: { zh: '日语', en: 'Japanese' } },
  { code: 'spanish', label: { zh: '西班牙语', en: 'Spanish' } },
]

export const LANGS: {
  code: LangCode
  label: { zh: string; en: string }
  native: string
  tts: string
  color: string
}[] = [
  { code: 'en', label: { zh: '英语', en: 'English' }, native: 'English', tts: 'en-US', color: '#7C5CFF' },
  { code: 'ja', label: { zh: '日语', en: 'Japanese' }, native: '日本語', tts: 'ja-JP', color: '#FF6B8A' },
  { code: 'es', label: { zh: '西班牙语', en: 'Spanish' }, native: 'Español', tts: 'es-ES', color: '#FFB020' },
]

export function getDeck(id: string): Deck | undefined {
  return DECKS.find((d) => d.id === id)
}

export function deckWords(deckId: string): Word[] {
  return ALL_WORDS.filter((w) => w.deckId === deckId)
}

/**
 * 取若干词书的词条。
 * 同一单词（同语言、同拼写）只保留第一条 —— 同时勾选「四级」与「考研」这类高度重叠的书时，
 * 队列里不会出现两张卡。带例句的精选条目在语料里排在最前，所以优先保留的是内容更全的那条。
 */
export function wordsOfDecks(deckIds: string[]): Word[] {
  const seen = new Set<string>()
  const out: Word[] = []
  for (const w of ALL_WORDS) {
    if (!deckIds.includes(w.deckId)) continue
    const k = `${w.lang}|${w.lemma.toLowerCase()}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push(w)
  }
  return out
}

export function ttsLocaleOf(lang: LangCode): string {
  return LANGS.find((l) => l.code === lang)?.tts ?? 'en-US'
}
