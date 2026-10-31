import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CardState, GameRun, LangCode, Profile, Rating, ReviewLog, Settings } from '@/data/types'
import { ALL_WORDS, WORD_MAP, wordsOfDecks } from '@/data'
import { DAY, newCard, schedule, todayKey } from './srs'

export interface GameState {
  profile: Profile
  settings: Settings
  cards: Record<string, CardState>
  logs: ReviewLog[]
  runs: GameRun[]
  achievements: string[]
  lastRun: GameRun | null

  reviewWord: (wordId: string, rating: Rating, source: ReviewLog['source'], elapsed: number) => void
  finishRun: (run: GameRun, answers: { wordId: string; correct: boolean }[]) => void
  patchSettings: (p: Partial<Settings>) => void
  /** 同一时间只学一本：整组替换，而不是往数组里追加 */
  setActiveDeck: (deckId: string) => void
  resetAll: () => void
}

const defaultProfile: Profile = {
  name: '旅行者',
  xp: 0,
  gems: 0,
  streak: 0,
  longestStreak: 0,
  lastStudyDay: null,
  petXp: 0,
  seasonPoints: 0,
  totalReviews: 0,
  correctReviews: 0,
}

const defaultSettings: Settings = {
  uiLocale: 'zh',
  nativeLocale: 'zh',
  theme: 'dark',
  dailyGoal: 12,
  sound: true,
  targetLang: 'en',
  activeDecks: ['en-cet4'],
  onboarded: false,
}

export function levelOf(xp: number) {
  let level = 1
  let need = 100
  let acc = 0
  while (xp >= acc + need && level < 99) {
    acc += need
    level += 1
    need = Math.round(need * 1.35)
  }
  return { level, cur: xp - acc, need, progress: Math.min(1, (xp - acc) / need) }
}

export const PET_STAGES = [
  { at: 0, name: { zh: '词蛋', en: 'Word Egg' }, icon: 'egg' },
  { at: 400, name: { zh: '萌芽兽', en: 'Sprout' }, icon: 'seed' },
  { at: 1200, name: { zh: '书灵', en: 'Bookling' }, icon: 'book' },
  { at: 2600, name: { zh: '语狐', en: 'Lexifox' }, icon: 'fox' },
  { at: 4800, name: { zh: '词龙', en: 'Wordragon' }, icon: 'dragon' },
  { at: 8000, name: { zh: '星辉兽', en: 'Starlit' }, icon: 'star' },
]

export function petStage(petXp: number) {
  let idx = 0
  for (let i = 0; i < PET_STAGES.length; i++) if (petXp >= PET_STAGES[i].at) idx = i
  return { idx, ...PET_STAGES[idx] }
}

function bumpStreak(profile: Profile): Profile {
  const today = todayKey()
  if (profile.lastStudyDay === today) return profile
  const yesterday = todayKey(new Date(Date.now() - DAY))
  const streak = profile.lastStudyDay === yesterday ? profile.streak + 1 : 1
  return {
    ...profile,
    streak,
    longestStreak: Math.max(profile.longestStreak, streak),
    lastStudyDay: today,
  }
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      settings: defaultSettings,
      cards: {},
      logs: [],
      runs: [],
      achievements: [],
      lastRun: null,

      reviewWord: (wordId, rating, source, elapsed) => {
        const now = Date.now()
        const { cards, profile, logs } = get()
        const prev = cards[wordId] ?? newCard(wordId)
        const next = schedule(prev, rating, now)
        const correct = rating > 1
        const gainedXp = correct ? (rating === 4 ? 8 : rating === 3 ? 10 : 14) : 2
        const nextProfile = bumpStreak({
          ...profile,
          xp: profile.xp + gainedXp,
          petXp: profile.petXp + gainedXp,
          gems: profile.gems + (next.mastered && !prev.mastered ? 5 : 0),
          seasonPoints: profile.seasonPoints + gainedXp,
          totalReviews: profile.totalReviews + 1,
          correctReviews: profile.correctReviews + (correct ? 1 : 0),
        })
        const log: ReviewLog = { wordId, rating, source, elapsed, at: now, correct }
        set({
          cards: { ...cards, [wordId]: next },
          profile: nextProfile,
          logs: [log, ...logs].slice(0, 2000),
        })
      },

      finishRun: (run, answers) => {
        const now = Date.now()
        const { cards, profile, logs, runs } = get()
        const nextCards = { ...cards }
        const newLogs: ReviewLog[] = []
        let xp = 0
        let petXp = 0
        let gems = 0

        for (const a of answers) {
          const prev = nextCards[a.wordId] ?? newCard(a.wordId)
          const rating: Rating = a.correct ? 3 : 1
          const next = schedule(prev, rating, now)
          nextCards[a.wordId] = next
          newLogs.push({ wordId: a.wordId, rating, source: run.game, elapsed: 0, at: now, correct: a.correct })
          xp += a.correct ? 10 : 2
          petXp += a.correct ? 10 : 2
          if (next.mastered && !prev.mastered) gems += 5
        }

        const answered = answers.length || 1
        const nextProfile = bumpStreak({
          ...profile,
          xp: profile.xp + xp + Math.round(run.score / 10),
          petXp: petXp + Math.round(run.score / 10),
          gems: profile.gems + gems + Math.round(run.score / 120),
          seasonPoints: profile.seasonPoints + xp + Math.round(run.score / 10),
          totalReviews: profile.totalReviews + answered,
          correctReviews: profile.correctReviews + answers.filter((a) => a.correct).length,
        })

        set({
          cards: nextCards,
          profile: nextProfile,
          logs: [...newLogs, ...logs].slice(0, 2000),
          runs: [run, ...runs].slice(0, 60),
          lastRun: run,
        })
      },

      patchSettings: (p) => set({ settings: { ...get().settings, ...p } }),

      setActiveDeck: (deckId) => {
        const { settings } = get()
        if (settings.activeDecks.length === 1 && settings.activeDecks[0] === deckId) return
        set({ settings: { ...settings, activeDecks: [deckId] } })
      },

      resetAll: () =>
        set({
          profile: defaultProfile,
          settings: { ...get().settings, onboarded: false },
          cards: {},
          logs: [],
          runs: [],
          achievements: [],
          lastRun: null,
        }),
    }),
    {
      name: 'wordquest-v1',
      version: 2,
      /**
       * v1 允许多选，但学习队列按数组顺序取词，于是「选了高中却还在背四级」。
       * 折成第一本 —— 那正是用户升级前实际在背的那本，恢复单一选择不该顺手换掉他的书。
       */
      migrate: (persisted, version) => {
        const s = persisted as { settings?: Settings } | undefined
        const decks = s?.settings?.activeDecks
        if (s?.settings && (version < 2 || (decks?.length ?? 0) > 1)) {
          s.settings = { ...s.settings, activeDecks: [decks?.[0] ?? 'en-cet4'] }
        }
        return s as never
      },
      partialize: (s) => ({
        profile: s.profile,
        settings: s.settings,
        cards: s.cards,
        logs: s.logs,
        runs: s.runs,
        achievements: s.achievements,
      }),
    },
  ),
)

/* ---------------- 派生数据 ---------------- */

export interface QueueItem {
  id: string
  kind: 'due' | 'new' | 'weak' | 'early'
}

/**
 * 只取「已到期」的复习词，按到期时间从早到晚排序。
 * 待复习数字和复习队列必须来自同一个函数，否则会出现「首页说 12 个待复习、进去却只有 3 个」。
 */
export function dueItems(
  cards: Record<string, CardState>,
  deckIds: string[],
  now = Date.now(),
): QueueItem[] {
  const out: QueueItem[] = []
  for (const w of wordsOfDecks(deckIds)) {
    const c = cards[w.id]
    if (c && c.state !== 'new' && c.due <= now) out.push({ id: w.id, kind: 'due' })
  }
  out.sort((a, b) => (cards[a.id]?.due ?? 0) - (cards[b.id]?.due ?? 0))
  return out
}

/** 逾期超过一天的词，用于提示「积压」 */
export function overdueCount(
  cards: Record<string, CardState>,
  deckIds: string[],
  now = Date.now(),
): number {
  return dueItems(cards, deckIds, now).filter((i) => (cards[i.id]?.due ?? now) < now - DAY).length
}

/**
 * 还没到期、但最快就要到的词 —— 「提前复习」用。
 *
 * 复习入口不能因为「今天没到点」就变成死的：到期数为 0 时把最近要复习的一批
 * 提前拉出来过一遍，评级照样生效（schedule 会按新评级重排下次时间），
 * 比让用户在首页看着一个点不动的按钮干等有用得多。
 */
export function earlyItems(
  cards: Record<string, CardState>,
  deckIds: string[],
  limit = 20,
  now = Date.now(),
): QueueItem[] {
  const out: QueueItem[] = []
  for (const w of wordsOfDecks(deckIds)) {
    const c = cards[w.id]
    if (!c || c.state === 'new' || c.due <= now) continue
    out.push({ id: w.id, kind: 'early' })
  }
  out.sort((a, b) => (cards[a.id]?.due ?? 0) - (cards[b.id]?.due ?? 0))
  return out.slice(0, limit)
}

/** 首页/词库的复习入口统一走这里，保证「按钮上写的数字」和「进去看到的词」是同一批 */
export function reviewTarget(
  cards: Record<string, CardState>,
  deckIds: string[],
  limit = 20,
  now = Date.now(),
): { mode: 'due' | 'early' | 'none'; count: number; to: string } {
  const due = dueItems(cards, deckIds, now).length
  if (due > 0) return { mode: 'due', count: due, to: '/learn?mode=due' }
  const early = earlyItems(cards, deckIds, limit, now).length
  if (early > 0) return { mode: 'early', count: early, to: '/learn?mode=early' }
  return { mode: 'none', count: 0, to: '/learn' }
}

export function buildQueue(
  cards: Record<string, CardState>,
  deckIds: string[],
  dailyGoal: number,
  now = Date.now(),
): QueueItem[] {
  const words = wordsOfDecks(deckIds)
  const due: QueueItem[] = dueItems(cards, deckIds, now)
  const fresh: QueueItem[] = []
  const weak: QueueItem[] = []

  for (const w of words) {
    const c = cards[w.id]
    if (!c || c.state === 'new') {
      fresh.push({ id: w.id, kind: 'new' })
    } else if (c.due > now && c.lapses > 0 && c.state === 'relearning') {
      weak.push({ id: w.id, kind: 'weak' })
    }
  }

  fresh.sort((a, b) => (WORD_MAP[a.id]?.freq ?? 0) - (WORD_MAP[b.id]?.freq ?? 0))

  const out: QueueItem[] = []
  const dueTake = due.slice(0, 200)
  const freshTake = fresh.slice(0, Math.max(0, dailyGoal))
  let di = 0
  let fi = 0
  while (di < dueTake.length || fi < freshTake.length) {
    for (let k = 0; k < 3 && di < dueTake.length; k++) out.push(dueTake[di++])
    if (fi < freshTake.length) out.push(freshTake[fi++])
  }
  return [...out, ...weak.slice(0, 10)]
}

export function deckProgress(cards: Record<string, CardState>, deckId: string) {
  const words = ALL_WORDS.filter((w) => w.deckId === deckId)
  let learned = 0
  let mastered = 0
  for (const w of words) {
    const c = cards[w.id]
    if (c && c.reps > 0) learned += 1
    if (c?.mastered) mastered += 1
  }
  return { total: words.length, learned, mastered, pct: words.length ? learned / words.length : 0 }
}

export function summarize(cards: Record<string, CardState>, logs: ReviewLog[], deckIds?: string[]) {
  const today = todayKey()
  const todayLogs = logs.filter((l) => todayKey(new Date(l.at)) === today)
  const totalCards = Object.keys(cards).length
  const mastered = Object.values(cards).filter((c) => c.mastered).length
  // 有词库范围时只统计当前在学的词库，避免切换语种后出现「待复习数」与队列对不上
  const dueNow = deckIds
    ? dueItems(cards, deckIds).length
    : Object.values(cards).filter((c) => c.state !== 'new' && c.due <= Date.now()).length
  const acc = logs.length ? logs.filter((l) => l.correct).length / logs.length : 0

  const byDay = new Map<string, number>()
  for (const l of logs) {
    const k = todayKey(new Date(l.at))
    byDay.set(k, (byDay.get(k) ?? 0) + 1)
  }
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * DAY)
    const k = todayKey(d)
    return { key: k, label: `${d.getMonth() + 1}/${d.getDate()}`, count: byDay.get(k) ?? 0 }
  })

  return { todayCount: todayLogs.length, totalCards, mastered, dueNow, acc, last7, todayCorrect: todayLogs.filter((l) => l.correct).length }
}

export function weakWords(cards: Record<string, CardState>, limit = 8) {
  return Object.values(cards)
    .filter((c) => c.lapses > 0)
    .sort((a, b) => b.lapses - a.lapses || a.stability - b.stability)
    .slice(0, limit)
}

export function langOfDeck(deckIds: string[]): LangCode {
  const w = wordsOfDecks(deckIds)[0]
  return w?.lang ?? 'en'
}
