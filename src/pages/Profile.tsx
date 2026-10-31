import { useMemo } from 'react'
import {
  CalendarCheck,
  Flame,
  Footprints,
  Languages,
  Moon,
  Settings,
  Sparkles,
  Sprout,
  Swords,
  Target,
  TrendingUp,
  Trees,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ACHIEVEMENTS } from '@/lib/achievements'
import { PET_STAGES, levelOf, petStage, summarize } from '@/lib/store'
import { useGame } from '@/lib/store'
import { Bar, Ring } from '@/components/ui'
import { cn, pct } from '@/lib/utils'
import { pick, useT } from '@/i18n'

const ICONS: Record<string, LucideIcon> = {
  footprints: Footprints,
  flame: Flame,
  'flame-kindling': Flame,
  swords: Swords,
  sprout: Sprout,
  trees: Trees,
  'calendar-check': CalendarCheck,
  trophy: Trophy,
  zap: Zap,
  target: Target,
  sparkles: Sparkles,
  languages: Languages,
  'trending-up': TrendingUp,
  moon: Moon,
}

const GAME_NAME: Record<string, string> = {
  falling: 'games.falling.name',
  boss: 'games.boss.name',
  forge: 'games.forge.name',
  echo: 'games.echo.name',
}

export default function ProfilePage() {
  const t = useT()
  const locale = useGame((s) => s.settings.uiLocale)
  const profile = useGame((s) => s.profile)
  const cards = useGame((s) => s.cards)
  const logs = useGame((s) => s.logs)
  const runs = useGame((s) => s.runs)
  const settings = useGame((s) => s.settings)

  const sum = useMemo(() => summarize(cards, logs), [cards, logs])
  const level = levelOf(profile.xp)
  const pet = petStage(profile.petXp)
  const nextStage = PET_STAGES[Math.min(pet.idx + 1, PET_STAGES.length - 1)]

  const snapshot = { profile, cards, logs, runs, settings }
  const unlocked = useMemo(
    () => new Set(ACHIEVEMENTS.filter((a) => a.check(snapshot)).map((a) => a.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, cards, logs, runs, settings],
  )

  const best = runs.reduce((m, r) => Math.max(m, r.score), 0)

  return (
    <div className="space-y-5">
      <header className="card relative overflow-hidden p-5">
        <div
          className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--brand), transparent 70%)' }}
        />
        <Link
          to="/settings"
          aria-label={t('nav.settings')}
          className="absolute right-4 top-4 z-[1] grid h-8 w-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-[var(--surface-2)] hover:text-ink"
        >
          <Settings size={15} />
        </Link>
        <div className="relative flex items-center gap-4">
          <Ring value={level.progress} size={84} stroke={7}>
            <div className="text-center">
              <div className="text-[19px] font-medium leading-none tnum">{level.level}</div>
              <div className="mt-0.5 text-[9px] text-ink-3">LV</div>
            </div>
          </Ring>
          <div className="min-w-0 flex-1">
            <div className="text-[18px] font-medium">{profile.name}</div>
            <div className="mt-0.5 text-[11.5px] text-ink-3">
              {profile.xp} XP · {t('profile.toNext')} {level.need - level.cur}
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <span className="chip text-[var(--amber)]">
                <Flame size={11} />
                {profile.streak} {t('common.days')}
              </span>
              <span className="chip">
                <Trophy size={11} />
                {best}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card px-4 py-3.5">
          <div className="text-[11px] text-ink-3">{t('profile.totalLearned')}</div>
          <div className="mt-1.5 text-[21px] font-medium leading-none tnum">{sum.totalCards}</div>
        </div>
        <div className="card px-4 py-3.5">
          <div className="text-[11px] text-ink-3">{t('profile.mastered')}</div>
          <div className="mt-1.5 text-[21px] font-medium leading-none tnum text-[var(--green)]">{sum.mastered}</div>
        </div>
        <div className="card px-4 py-3.5">
          <div className="text-[11px] text-ink-3">{t('profile.accuracy')}</div>
          <div className="mt-1.5 text-[21px] font-medium leading-none tnum">{pct(sum.acc)}</div>
        </div>
        <div className="card px-4 py-3.5">
          <div className="text-[11px] text-ink-3">{t('profile.reviews')}</div>
          <div className="mt-1.5 text-[21px] font-medium leading-none tnum">{profile.totalReviews}</div>
        </div>
      </div>

      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-medium">{t('home.pet')}</h2>
          <span className="text-[11px] text-ink-3 tnum">
            {profile.petXp} / {nextStage.at}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand/25 to-brand-2/20 text-brand">
            <Sparkles size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-medium">{pick(pet.name, locale)}</div>
            <div className="mt-1 text-[11px] text-ink-3">
              {t('home.petNext')} · {pick(nextStage.name, locale)}
            </div>
            <div className="mt-2 max-w-[320px]">
              <Bar value={nextStage.at > pet.at ? (profile.petXp - pet.at) / (nextStage.at - pet.at) : 1} />
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-medium">{t('profile.achievements')}</h2>
          <span className="text-[11.5px] text-ink-3 tnum">
            {unlocked.size}/{ACHIEVEMENTS.length}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {ACHIEVEMENTS.map((a) => {
            const on = unlocked.has(a.id)
            const Icon = ICONS[a.icon] ?? Trophy
            return (
              <div
                key={a.id}
                title={`${pick(a.title, locale)} — ${pick(a.desc, locale)}`}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 text-center transition-colors',
                  on ? 'border-brand/40 bg-[color-mix(in_srgb,var(--brand)_10%,transparent)]' : 'border-line bg-[var(--surface)] opacity-45',
                )}
              >
                <div className={cn('grid h-9 w-9 place-items-center rounded-xl', on ? 'text-brand' : 'text-ink-3')}>
                  <Icon size={17} />
                </div>
                <div className="line-clamp-2 text-[10px] leading-tight">{pick(a.title, locale)}</div>
              </div>
            )
          })}
        </div>
      </section>

      {runs.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 text-[14px] font-medium">{t('profile.recent')}</h2>
          <ul className="space-y-1">
            {runs.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-lg px-1 py-1.5 text-[12.5px]">
                <span className="text-ink-3 tnum">{new Date(r.at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')}</span>
                <span className="truncate text-ink-2">{t(GAME_NAME[r.game] ?? 'games.falling.name')}</span>
                <span className="ml-auto text-ink-2 tnum">{Math.round(r.accuracy * 100)}%</span>
                <span className="w-12 text-right font-medium tnum">{r.score}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
