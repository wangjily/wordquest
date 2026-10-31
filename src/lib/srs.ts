import type { CardState, Rating } from '@/data/types'

export const DAY = 86_400_000

const W = [
  0.4872, 1.4003, 3.7145, 13.8206, // 初始 stability（again / hard / good / easy）
  5.1618, 1.2298, // 初始 difficulty
  0.8975, 0.031, // difficulty 更新与均值回归
  1.6474, 0.1367, 1.0461, // 成功复习的 stability 更新
  2.1072, 0.0793, 0.3246, 1.587, // 遗忘后的 stability 更新
  0.2272, 2.8755, // hard 惩罚 / easy 奖励
]

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export function newCard(wordId: string): CardState {
  return {
    wordId,
    stability: 0,
    difficulty: 0,
    due: Date.now(),
    reps: 0,
    lapses: 0,
    state: 'new',
    lastReview: null,
    mastered: false,
  }
}

/** 当前时刻对这张卡片的记忆可提取概率（0-1） */
export function retrievability(card: CardState, now = Date.now()): number {
  if (!card.stability || card.state === 'new') return 0
  const elapsed = Math.max(0, (now - (card.lastReview ?? now)) / DAY)
  return Math.pow(1 + elapsed / (9 * card.stability), -1)
}

/**
 * FSRS-4.5 简化实现：根据四档自评更新记忆状态与下次到期时间。
 * 返回新的卡片状态（不变更入参）。
 */
export function schedule(card: CardState, rating: Rating, now = Date.now()): CardState {
  const isNew = card.state === 'new' || card.reps === 0
  const elapsedDays = card.lastReview ? Math.max(0, (now - card.lastReview) / DAY) : 0
  const r = isNew ? 0 : Math.pow(1 + elapsedDays / (9 * Math.max(card.stability, 0.1)), -1)

  let stability: number
  let difficulty: number
  let lapses = card.lapses
  let state: CardState['state']

  if (isNew) {
    stability = W[rating - 1]
    difficulty = clamp(W[4] - W[5] * (rating - 3), 1, 10)
    state = rating === 1 ? 'relearning' : 'learning'
  } else if (rating === 1) {
    stability =
      W[11] *
      Math.pow(clamp(card.difficulty, 1, 10), -W[12]) *
      (Math.pow(card.stability + 1, W[13]) - 1) *
      Math.exp(W[14] * (1 - r))
    difficulty = clamp(card.difficulty - W[6] * (rating - 3), 1, 10)
    lapses += 1
    state = 'relearning'
  } else {
    const hardPenalty = rating === 2 ? W[15] : 1
    const easyBonus = rating === 4 ? W[16] : 1
    const growth =
      1 +
      Math.exp(W[8]) *
        (11 - clamp(card.difficulty, 1, 10)) *
        Math.pow(Math.max(card.stability, 0.1), -W[9]) *
        (Math.exp(W[10] * (1 - r)) - 1) *
        hardPenalty *
        easyBonus
    stability = Math.min(card.stability * growth, 365)
    difficulty = clamp(card.difficulty - W[6] * (rating - 3), 1, 10)
    state = 'review'
  }

  stability = clamp(stability, 0.1, 365)
  // 均值回归，避免 difficulty 长期漂到极值
  difficulty = clamp(W[7] * W[4] + (1 - W[7]) * difficulty, 1, 10)

  const nextDue = rating === 1 ? now + 10 * 60 * 1000 : now + stability * DAY

  return {
    ...card,
    stability,
    difficulty,
    due: nextDue,
    reps: card.reps + 1,
    lapses,
    state,
    lastReview: now,
    mastered: stability >= 21 && lapses <= 2,
  }
}

/** 下次间隔的人类可读描述 */
export function intervalLabel(card: CardState, rating: Rating, locale: 'zh' | 'en' = 'zh'): string {
  const next = schedule(card, rating)
  const delta = next.due - Date.now()
  const minutes = Math.round(delta / 60000)
  if (minutes < 60) return locale === 'zh' ? `${minutes} 分钟后` : `${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return locale === 'zh' ? `${hours} 小时后` : `${hours}h`
  const days = Math.round(hours / 24)
  if (days < 30) return locale === 'zh' ? `${days} 天后` : `${days}d`
  const months = Math.round(days / 30)
  return locale === 'zh' ? `${months} 个月后` : `${months}mo`
}

export function isDue(card: CardState, now = Date.now()): boolean {
  return card.state !== 'new' && card.due <= now
}

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
