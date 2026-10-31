export type LangCode = 'en' | 'ja' | 'es'

/** 词书所属学段，对应词库页顶部的一级分类 */
export type Stage =
  | 'phonics'
  | 'primary'
  | 'junior'
  | 'senior'
  | 'cet4'
  | 'cet6'
  | 'postgrad'
  | 'abroad'
  | 'major'
  | 'japanese'
  | 'spanish'
  | 'other'

export interface DeckCover {
  /** 封面渐变起止色 */
  from: string
  to: string
  /** 封面文字颜色 */
  ink: string
  /** 书脊上的小字，如 CET-4 / PHONICS */
  label: string
  /** 封面主字，如 四级 / GRE */
  big: string
}

export interface Word {
  id: string
  lang: LangCode
  deckId: string
  lemma: string
  reading?: string
  phonetic?: string
  pos?: string
  zh: string
  example: string
  exampleZh: string
  freq: number
}

export interface Deck {
  id: string
  lang: LangCode
  title: { zh: string; en: string }
  level: string
  examTag: string
  desc: { zh: string; en: string }
  accent: 'violet' | 'cyan' | 'amber' | 'rose'
  /** 一级分类 */
  stage: Stage
  /** 二级分类（教材版本 / 系列），'全部' 之外的 pill */
  series: string
  /** 书封样式 */
  cover: DeckCover
  /** 是否打 NEW 角标 */
  isNew?: boolean
  /** 词条数（全量语料提供，避免为了显示词数去加载整本词条） */
  count?: number
}

export type GameId = 'falling' | 'boss' | 'forge' | 'echo'

export type Rating = 1 | 2 | 3 | 4

export interface CardState {
  wordId: string
  stability: number
  difficulty: number
  due: number
  reps: number
  lapses: number
  state: 'new' | 'learning' | 'review' | 'relearning'
  lastReview: number | null
  mastered: boolean
}

export interface ReviewLog {
  wordId: string
  rating: Rating
  source: 'card' | GameId
  elapsed: number
  at: number
  correct: boolean
}

export interface GameRun {
  id: string
  game: GameId
  score: number
  accuracy: number
  comboMax: number
  total: number
  correct: number
  duration: number
  at: number
}

export interface Profile {
  name: string
  xp: number
  gems: number
  streak: number
  longestStreak: number
  lastStudyDay: string | null
  petXp: number
  seasonPoints: number
  totalReviews: number
  correctReviews: number
}

export interface Settings {
  uiLocale: 'zh' | 'en'
  nativeLocale: 'zh' | 'en'
  theme: 'dark' | 'light'
  dailyGoal: number
  sound: boolean
  targetLang: LangCode
  activeDecks: string[]
  onboarded: boolean
}
