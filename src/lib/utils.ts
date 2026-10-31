export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function sample<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n)
}

export function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

export function pct(n: number, digits = 0) {
  return `${(n * 100).toFixed(digits)}%`
}

export function greetingKey(d = new Date()): string {
  const h = d.getHours()
  if (h < 12) return 'home.greet.morning'
  if (h < 18) return 'home.greet.afternoon'
  return 'home.greet.evening'
}

export function dayLabel(offset: number, locale: 'zh' | 'en') {
  const d = new Date(Date.now() + offset * 86400000)
  if (locale === 'zh') return `${d.getMonth() + 1}/${d.getDate()}`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
