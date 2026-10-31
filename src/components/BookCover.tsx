import type { Deck } from '@/data/types'
import { cn } from '@/lib/utils'

const SIZES = {
  sm: { box: 'h-[62px] w-[44px]', pad: 'px-1 py-1', label: 'text-[5.5px]', big: 'text-[12px]', bar: 'h-[2px] w-4' },
  md: { box: 'h-[78px] w-[56px]', pad: 'px-1.5 py-1.5', label: 'text-[6.5px]', big: 'text-[15px]', bar: 'h-[3px] w-5' },
  lg: { box: 'h-[120px] w-[86px]', pad: 'px-2 py-2', label: 'text-[7.5px]', big: 'text-[22px]', bar: 'h-[3px] w-7' },
} as const

/** 书封：纯 CSS 画的小书，不依赖任何图片资源 */
export function BookCover({
  deck,
  className,
  compact,
  size,
}: {
  deck: Deck
  className?: string
  /** 兼容旧用法：等价于 size="sm" */
  compact?: boolean
  size?: keyof typeof SIZES
}) {
  const s = SIZES[size ?? (compact ? 'sm' : 'md')]
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-[7px] rounded-l-[4px] shadow-[0_10px_22px_-12px_rgba(0,0,0,0.85)]',
        s.box,
        className,
      )}
      style={{ background: `linear-gradient(160deg, ${deck.cover.from}, ${deck.cover.to})`, color: deck.cover.ink }}
    >
      <div className="absolute inset-y-0 left-0 w-[5px] bg-black/10" />
      <div className={cn('relative flex h-full flex-col justify-between', s.pad)}>
        <div className={cn('truncate font-bold uppercase tracking-tight opacity-70', s.label)}>{deck.cover.label}</div>
        <div className={cn('text-center font-bold leading-none tracking-tight', s.big)}>{deck.cover.big}</div>
        <div className={cn('mx-auto rounded-full bg-current opacity-25', s.bar)} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/45 via-transparent to-black/10" />
    </div>
  )
}
