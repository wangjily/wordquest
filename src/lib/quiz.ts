import type { Word } from '@/data/types'
import { WORD_MAP, wordsOfDecks } from '@/data'
import { buildQueue, useGame } from './store'
import { shuffle } from './utils'

export interface Question {
  word: Word
  options: Word[]
  answer: number
  elite?: boolean
}

/** 从当前词库 + 复习队列里取一局可用的题目来源 */
export function gamePool(): { seed: Word[]; pool: Word[] } {
  const st = useGame.getState()
  const pool = wordsOfDecks(st.settings.activeDecks)
  const queue = buildQueue(st.cards, st.settings.activeDecks, st.settings.dailyGoal)
  const queueWords = queue.map((q) => WORD_MAP[q.id]).filter(Boolean) as Word[]
  const learned = Object.keys(st.cards).map((id) => WORD_MAP[id]).filter(Boolean) as Word[]
  const seed = queueWords.length >= 6 ? queueWords : [...queueWords, ...learned]
  return { seed: seed.length >= 4 ? seed : pool, pool }
}

export function questionFor(word: Word, pool: Word[], elite = false): Question {
  const same = pool.filter((w) => w.lang === word.lang && w.id !== word.id)
  const distractors = shuffle(same).slice(0, 3)
  const options = shuffle([word, ...distractors])
  return { word, options, answer: options.findIndex((o) => o.id === word.id), elite }
}

export function makeQuestions(seed: Word[], pool: Word[], count: number): Question[] {
  const base = seed.length ? seed : pool
  return Array.from({ length: count }, (_, i) => questionFor(base[i % base.length], pool))
}

/** 拼写目标：日语用假名读音，其余用词形 */
export function spellTarget(w: Word): string {
  const raw = w.lang === 'ja' && w.reading ? w.reading : w.lemma
  return raw.replace(/[\s'’·\-‐]/g, '')
}
