import type { Deck, Word } from './types'
import cet4 from './dicts/cet4.json'
import cet6 from './dicts/cet6.json'
import postgrad from './dicts/postgrad.json'

/**
 * 「完整版」词书：来自公开大纲词表（CET4_T / CET6_T / KaoYan_3_T），
 * 每条只有单词 + 音标 + 释义；其中能与精选词条对上的（约 300–400 条）带例句。
 * 数据由 scripts/gen-big.mjs 生成，不要手改 dicts/*.json。
 */

type Row = string[]

function buildBig(rows: Row[], deck: Deck): Word[] {
  return rows.map((r, i) => ({
    id: `${deck.id}-${i}`,
    lang: 'en' as const,
    deckId: deck.id,
    lemma: r[0],
    phonetic: r[1] || undefined,
    zh: r[2],
    example: r[3] ?? '',
    exampleZh: r[4] ?? '',
    freq: i,
  }))
}

export const deckCet4Full: Deck = {
  id: 'en-cet4-full',
  lang: 'en',
  title: { zh: '四级大纲全量', en: 'CET-4 Full' },
  level: 'B1–B2',
  examTag: 'CET-4',
  desc: { zh: '2607 词，四级大纲全量，扫完不留死角', en: 'All 2,607 words of the CET-4 syllabus' },
  accent: 'cyan',
  stage: 'cet4',
  series: '大纲',
  isNew: true,
  cover: { from: '#CBE9F7', to: '#7FC4E8', ink: '#0F4459', label: 'CET-4 FULL', big: '四级' },
}

export const deckCet6Full: Deck = {
  id: 'en-cet6-full',
  lang: 'en',
  title: { zh: '六级大纲全量', en: 'CET-6 Full' },
  level: 'B2–C1',
  examTag: 'CET-6',
  desc: { zh: '2345 词，六级大纲全量', en: 'All 2,345 words of the CET-6 syllabus' },
  accent: 'rose',
  stage: 'cet6',
  series: '大纲',
  isNew: true,
  cover: { from: '#FFD5DE', to: '#F290A6', ink: '#7A2137', label: 'CET-6 FULL', big: '六级' },
}

export const deckPostgradFull: Deck = {
  id: 'en-postgrad-full',
  lang: 'en',
  title: { zh: '考研大纲全量', en: 'Postgrad Full' },
  level: 'C1',
  examTag: '考研',
  desc: { zh: '3725 词，考研英语大纲全量', en: 'All 3,725 words of the postgraduate syllabus' },
  accent: 'amber',
  stage: 'postgrad',
  series: '大纲',
  isNew: true,
  cover: { from: '#FFE3B8', to: '#EFAE62', ink: '#6E3D09', label: 'KAOYAN FULL', big: '考研' },
}

export const bigDecks: Deck[] = [deckCet4Full, deckCet6Full, deckPostgradFull]

export const bigWords: Word[] = [
  ...buildBig(cet4 as Row[], deckCet4Full),
  ...buildBig(cet6 as Row[], deckCet6Full),
  ...buildBig(postgrad as Row[], deckPostgradFull),
]
