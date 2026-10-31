import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Ring({
  value,
  size = 108,
  stroke = 9,
  children,
  tone = 'brand',
}: {
  value: number
  size?: number
  stroke?: number
  children?: ReactNode
  tone?: 'brand' | 'amber' | 'mint'
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const color = tone === 'amber' ? 'var(--amber)' : tone === 'mint' ? 'var(--green)' : 'var(--brand)'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

export function Bar({ value, tone = 'brand', className }: { value: number; tone?: 'brand' | 'amber' | 'mint' | 'rose'; className?: string }) {
  const bg =
    tone === 'amber'
      ? 'linear-gradient(90deg, var(--amber), #FFD57A)'
      : tone === 'mint'
        ? 'linear-gradient(90deg, var(--green), #7BE8BE)'
        : tone === 'rose'
          ? 'linear-gradient(90deg, var(--rose), #FFA3B6)'
          : 'linear-gradient(90deg, var(--brand), var(--brand-2))'
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]', className)}>
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, background: bg }}
      />
    </div>
  )
}

export function Stat({
  label,
  value,
  hint,
  icon,
  tone,
  to,
}: {
  label: string
  value: ReactNode
  hint?: string
  icon?: ReactNode
  tone?: 'brand' | 'amber' | 'mint' | 'rose'
  /** 传入路由后整卡可点击，右侧出现箭头 */
  to?: string
}) {
  const color =
    tone === 'amber'
      ? 'text-[var(--amber)]'
      : tone === 'mint'
        ? 'text-[var(--green)]'
        : tone === 'rose'
          ? 'text-[var(--rose)]'
          : 'text-brand'

  const body = (
    <>
      <div className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
        {icon ? <span className={color}>{icon}</span> : null}
        {label}
        {to ? <ChevronRight size={12} className="ml-auto opacity-40 transition-opacity group-hover:opacity-100" /> : null}
      </div>
      <div className="mt-1.5 text-[22px] font-medium leading-none tnum">{value}</div>
      {hint ? <div className="mt-1.5 text-[11px] text-ink-3">{hint}</div> : null}
    </>
  )

  if (to) {
    return (
      <Link to={to} className="card group block px-4 py-3.5 transition-colors hover:bg-[var(--surface-2)]">
        {body}
      </Link>
    )
  }

  return <div className="card px-4 py-3.5">{body}</div>
}

export function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-[14px] font-medium text-ink">{title}</h2>
      {action}
    </div>
  )
}

export function Empty({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--surface-2)] text-ink-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 19.5V6a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a2 2 0 0 1-2-1.5Z" />
          <path d="M8 7h6M8 11h6" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <div className="text-[14px] font-medium">{title}</div>
        {desc ? <div className="mt-1 text-[12.5px] text-ink-3">{desc}</div> : null}
      </div>
      {action}
    </div>
  )
}
