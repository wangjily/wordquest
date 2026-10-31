import type { CardState, GameRun, Profile, ReviewLog, Settings } from '@/data/types'

export interface Snapshot {
  profile: Profile
  cards: Record<string, CardState>
  logs: ReviewLog[]
  runs: GameRun[]
  settings: Settings
}

export interface Achievement {
  id: string
  title: { zh: string; en: string }
  desc: { zh: string; en: string }
  icon: string
  tier: 1 | 2 | 3
  check: (s: Snapshot) => boolean
}

const masteredCount = (s: Snapshot) => Object.values(s.cards).filter((c) => c.mastered).length
const bestScore = (s: Snapshot) => s.runs.reduce((m, r) => Math.max(m, r.score), 0)
const bestCombo = (s: Snapshot) => s.runs.reduce((m, r) => Math.max(m, r.comboMax), 0)

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-step',
    title: { zh: '第一步', en: 'First Step' },
    desc: { zh: '完成第一次单词复习', en: 'Complete your first review' },
    icon: 'footprints',
    tier: 1,
    check: (s) => s.logs.length >= 1,
  },
  {
    id: 'warm-up',
    title: { zh: '热身完毕', en: 'Warmed Up' },
    desc: { zh: '累计复习 50 次', en: '50 reviews in total' },
    icon: 'flame',
    tier: 1,
    check: (s) => s.profile.totalReviews >= 50,
  },
  {
    id: 'hundred',
    title: { zh: '百次磨砺', en: 'Hundred Cuts' },
    desc: { zh: '累计复习 300 次', en: '300 reviews in total' },
    icon: 'swords',
    tier: 2,
    check: (s) => s.profile.totalReviews >= 300,
  },
  {
    id: 'first-mastery',
    title: { zh: '初见成效', en: 'First Mastery' },
    desc: { zh: '掌握第 1 个词（稳定度 ≥ 21 天）', en: 'Master your first word' },
    icon: 'sprout',
    tier: 1,
    check: (s) => masteredCount(s) >= 1,
  },
  {
    id: 'mastery-30',
    title: { zh: '三十而立', en: 'Thirty Strong' },
    desc: { zh: '掌握 30 个词', en: 'Master 30 words' },
    icon: 'trees',
    tier: 2,
    check: (s) => masteredCount(s) >= 30,
  },
  {
    id: 'streak-3',
    title: { zh: '三天不辍', en: 'Three in a Row' },
    desc: { zh: '连续学习 3 天', en: 'Study 3 days in a row' },
    icon: 'calendar-check',
    tier: 1,
    check: (s) => s.profile.longestStreak >= 3,
  },
  {
    id: 'streak-7',
    title: { zh: '一周之火', en: 'Week of Fire' },
    desc: { zh: '连续学习 7 天', en: 'Study 7 days in a row' },
    icon: 'flame-kindling',
    tier: 2,
    check: (s) => s.profile.longestStreak >= 7,
  },
  {
    id: 'streak-30',
    title: { zh: '月之恒心', en: 'Month of Will' },
    desc: { zh: '连续学习 30 天', en: 'Study 30 days in a row' },
    icon: 'trophy',
    tier: 3,
    check: (s) => s.profile.longestStreak >= 30,
  },
  {
    id: 'combo-15',
    title: { zh: '连击达人', en: 'Combo Artist' },
    desc: { zh: '单局达成 15 连击', en: 'Reach a 15 combo in one run' },
    icon: 'zap',
    tier: 2,
    check: (s) => bestCombo(s) >= 15,
  },
  {
    id: 'score-1500',
    title: { zh: '千五高塔', en: '1500 Club' },
    desc: { zh: '单局得分达到 1500', en: 'Score 1500 in a single run' },
    icon: 'target',
    tier: 3,
    check: (s) => bestScore(s) >= 1500,
  },
  {
    id: 'flawless',
    title: { zh: '完美一局', en: 'Flawless' },
    desc: { zh: '一局中作答 ≥ 10 且全对', en: 'Answer 10+ with no mistakes' },
    icon: 'sparkles',
    tier: 3,
    check: (s) => s.runs.some((r) => r.total >= 10 && r.correct === r.total),
  },
  {
    id: 'polyglot',
    title: { zh: '多语并行', en: 'Polyglot' },
    desc: { zh: '同时学习 2 个不同语种的词库', en: 'Study decks from 2 languages' },
    icon: 'languages',
    tier: 2,
    check: (s) => s.settings.activeDecks.length >= 2,
  },
  {
    id: 'level-5',
    title: { zh: '五级旅人', en: 'Level Five' },
    desc: { zh: '经验值达到 5 级', en: 'Reach level 5' },
    icon: 'trending-up',
    tier: 2,
    check: (s) => s.profile.xp >= 700,
  },
  {
    id: 'night-owl',
    title: { zh: '夜行者', en: 'Night Owl' },
    desc: { zh: '在 0-5 点之间复习过一次', en: 'Review something between 0 and 5 AM' },
    icon: 'moon',
    tier: 1,
    check: (s) => s.logs.some((l) => new Date(l.at).getHours() < 5),
  },
]

export function unlockedIds(s: Snapshot): string[] {
  return ACHIEVEMENTS.filter((a) => a.check(s)).map((a) => a.id)
}
