import { Link } from 'react-router-dom'
import { AudioLines, Hammer, Play, ShieldQuestion, Trophy, Zap } from 'lucide-react'
import { useMemo } from 'react'
import { buildQueue, useGame } from '@/lib/store'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import type { GameId } from '@/data/types'

const SIDE_GAMES: { key: GameId; to: string; icon: typeof Hammer; accent: string; name: string; desc: string }[] = [
  { key: 'boss', to: '/games/boss', icon: ShieldQuestion, accent: 'var(--rose)', name: 'games.boss.name', desc: 'games.boss.desc' },
  { key: 'forge', to: '/games/forge', icon: Hammer, accent: 'var(--amber)', name: 'games.forge.name', desc: 'games.forge.desc' },
  { key: 'echo', to: '/games/echo', icon: AudioLines, accent: 'var(--brand-2)', name: 'games.echo.name', desc: 'games.echo.desc' },
]

export default function Games() {
  const t = useT()
  const cards = useGame((s) => s.cards)
  const settings = useGame((s) => s.settings)
  const runs = useGame((s) => s.runs)

  const queue = useMemo(
    () => buildQueue(cards, settings.activeDecks, settings.dailyGoal),
    [cards, settings.activeDecks, settings.dailyGoal],
  )

  const statOf = (game: GameId) => {
    const list = runs.filter((r) => r.game === game)
    return { best: list.reduce((m, r) => Math.max(m, r.score), 0), plays: list.length }
  }

  const falling = statOf('falling')
  const pool = queue.length + Object.values(cards).length

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-medium tracking-tight sm:text-[26px]">{t('games.title')}</h1>
        <p className="mt-1 text-[13px] text-ink-3">{t('games.subtitle')}</p>
      </header>

      <Link
        to="/games/falling"
        className="card group relative block overflow-hidden p-6 transition-transform active:scale-[0.99]"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(60% 120% at 85% -10%, color-mix(in srgb, var(--brand) 45%, transparent), transparent 65%), radial-gradient(50% 100% at 10% 110%, color-mix(in srgb, var(--brand-2) 32%, transparent), transparent 70%)',
          }}
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="chip border-transparent bg-white/10 text-white">Hot</span>
                <span className="text-[11px] text-white/60">
                  {pool} {t('common.words')}
                </span>
              </div>
              <h2 className="mt-3 text-[20px] font-medium text-white">{t('games.falling.name')}</h2>
              <p className="mt-1.5 max-w-[38ch] text-[12.5px] leading-relaxed text-white/70">
                {t('games.falling.desc')}
              </p>
            </div>
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-[#12121A] shadow-lg transition-transform group-hover:scale-105">
              <Play size={22} className="translate-x-[1px]" fill="currentColor" />
            </span>
          </div>

          <div className="mt-6 flex items-center gap-5 border-t border-white/15 pt-4 text-[11.5px] text-white/70">
            <span className="flex items-center gap-1.5">
              <Trophy size={13} />
              {t('result.score')} {falling.best}
            </span>
            <span className="flex items-center gap-1.5">
              <Zap size={13} />
              {falling.plays} {t('common.rounds')}
            </span>
            <span className="ml-auto flex items-center gap-1.5 text-white/50">
              {pool < 4 ? t('games.needMore') : `${t('games.play')} →`}
            </span>
          </div>
        </div>
      </Link>

      <div className="grid gap-3 sm:grid-cols-3">
        {SIDE_GAMES.map(({ key, to, icon: Icon, accent, name, desc }) => {
          const { best, plays } = statOf(key)
          return (
            <Link
              key={key}
              to={to}
              className={cn(
                'card group relative flex flex-col overflow-hidden p-4 transition-all duration-150',
                'hover:-translate-y-0.5 hover:border-brand/40 active:scale-[0.99]',
              )}
            >
              <div
                className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-200 group-hover:opacity-60"
                style={{ background: accent }}
              />
              <div
                className="relative grid h-10 w-10 place-items-center rounded-xl"
                style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}
              >
                <Icon size={18} />
              </div>
              <div className="relative mt-3 flex items-center gap-1.5">
                <span className="text-[13.5px] font-medium">{t(name)}</span>
              </div>
              <p className="relative mt-1 text-[11.5px] leading-relaxed text-ink-3">{t(desc)}</p>
              <div className="relative mt-3 flex items-center justify-between text-[10.5px] text-ink-3">
                <span className="tnum">
                  {plays > 0 ? `${t('result.score')} ${best}` : t('games.new')}
                </span>
                <span className="flex items-center gap-1 text-brand">
                  {t('games.play')} →
                </span>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="card p-5">
        <div className="text-[13px] font-medium">{t('games.pool')}</div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-3">
          {t('home.due')} {queue.filter((q) => q.kind === 'due').length} ·{' '}
          {t('home.newWords')} {queue.filter((q) => q.kind === 'new').length} ·{' '}
          {t('home.weak')} {queue.filter((q) => q.kind === 'weak').length}
        </p>
      </div>
    </div>
  )
}
