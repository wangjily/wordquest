/**
 * 轨道标签：悬在星系外圈的模式入口。
 *
 * 设计约束：
 * 1. 是主入口，不是装饰——每一项都是能点、能 Tab 到的链接。
 * 2. 位置由 cosmosLayout 推出，和画布上的星核用同一套坐标，窗口缩放后不会脱节。
 * 3. 文字块（标题、导语、按钮）可能很长，标签绝不能压上去。
 *    先量每一块的真实字形范围，再逐块避让；不能并成一个包围盒，
 *    否则顶部品牌栏会把整个上方都算成禁区。
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { cosmosLayout } from '@/lib/cosmos'
import { cn } from '@/lib/utils'

export interface OrbitItem {
  to: string
  name: string
  /** 拉丁副标题，英文界面下自动隐藏（和名字重复了） */
  tag: string
  /** 屏幕坐标角度：0° 向右、90° 向下，负值朝上 */
  a: number
  /** 相对星系盘半径的位置，1 ≈ 盘缘 */
  r: number
  /** 条目后面跟的小数字，复习入口用它显示待办量 */
  count?: number
  /** 暂时没有内容可进：灰掉但仍然可点（进去是空态说明） */
  quiet?: boolean
}

interface Rect {
  l: number
  t: number
  r: number
  b: number
}

interface Mark {
  left: number
  top: number
  w: number
  h: number
  ex: number
  ey: number
  tx: number
  ty: number
}

/** 标签与星核之间的间距 */
const GAP = 14
/** 视口安全边距 */
const PAD = 22
/** 顶部有品牌栏、底部有滚动提示，各自留出高度 */
const TOP = 74
const BOTTOM = 64
/** 与文字块至少隔这么远才算让开 */
const CLEAR = 12
/** 比这更窄就不显示：星盘已经贴着屏幕边，再挂标签只会挤成一团 */
const MIN_W = 960

export function OrbitNav({ items }: { items: OrbitItem[] }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [rects, setRects] = useState<Rect[]>([])
  const [sizes, setSizes] = useState<{ w: number; h: number }[]>([])
  const [hover, setHover] = useState<number | null>(null)

  // 量容器尺寸 + 每一块文字的真实字形范围。容器会被标题撑满整列，只有 Range 才准。
  useLayoutEffect(() => {
    const host = hostRef.current
    const hero = host?.parentElement
    if (!host || !hero) return

    const measure = () => {
      const hb = hero.getBoundingClientRect()
      setBox((prev) =>
        Math.abs(prev.w - hb.width) < 0.5 && Math.abs(prev.h - hb.height) < 0.5
          ? prev
          : { w: hb.width, h: hb.height },
      )

      const next: Rect[] = []
      hero.querySelectorAll('[data-orbit-safe]').forEach((el) => {
        const range = document.createRange()
        range.selectNodeContents(el)
        for (const rc of Array.from(range.getClientRects())) {
          if (rc.width < 2 || rc.height < 2) continue
          next.push({ l: rc.left - hb.left, t: rc.top - hb.top, r: rc.right - hb.left, b: rc.bottom - hb.top })
        }
      })
      setRects((prev) => {
        const same =
          prev.length === next.length &&
          prev.every((p, i) => Math.abs(p.l - next[i].l) < 1 && Math.abs(p.t - next[i].t) < 1 && Math.abs(p.r - next[i].r) < 1 && Math.abs(p.b - next[i].b) < 1)
        return same ? prev : next
      })
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(hero)
    // 字体晚到会让文字变宽，量完要再算一次
    document.fonts?.ready.then(measure).catch(() => {})
    return () => ro.disconnect()
  }, [])

  // 标签自身尺寸不参与定位，所以不会和 marks 互相触发，收敛很快
  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    const next = Array.from(host.querySelectorAll<HTMLElement>('.orbit-item')).map((el) => ({ w: el.offsetWidth, h: el.offsetHeight }))
    setSizes((prev) => {
      if (prev.length === next.length && prev.every((p, i) => Math.abs(p.w - next[i].w) < 0.5 && Math.abs(p.h - next[i].h) < 0.5)) return prev
      return next
    })
  })

  const marks = useMemo<Mark[]>(() => {
    if (box.w < MIN_W || !box.h || sizes.length !== items.length) return []
    const L = cosmosLayout(box.w, box.h)

    // 先把整圈半径收进视口，再摆位置——这样标签是等距的一圈，而不是逐个被拽进来
    let rx = L.maxR * 0.96
    let ry = L.maxR * 0.72
    items.forEach((it, i) => {
      const rad = (it.a * Math.PI) / 180
      const c = Math.cos(rad)
      const s = Math.sin(rad)
      const { w, h } = sizes[i]
      if (c > 0.05) rx = Math.min(rx, (box.w - PAD - GAP - w - L.cx) / (c * it.r))
      if (s > 0.05) ry = Math.min(ry, (box.h - BOTTOM - h / 2 - L.cy) / (s * it.r))
      if (s < -0.05) ry = Math.min(ry, (L.cy - TOP - h / 2) / (-s * it.r))
    })
    rx = Math.max(L.maxR * 0.4, rx)
    ry = Math.max(L.maxR * 0.3, ry)

    const placed: Mark[] = []

    items.forEach((it, i) => {
      const rad = (it.a * Math.PI) / 180
      const c = Math.cos(rad)
      const s = Math.sin(rad)
      const { w, h } = sizes[i]

      const ax = L.cx + c * rx * it.r
      const ay = L.cy + s * ry * it.r

      // 文字一律朝右展开：左侧留给标题，翻到锚点左边就会顶上去
      const left = Math.min(Math.max(PAD, ax + GAP), box.w - PAD - w)
      let cy = ay

      // 逐块躲开文字，最多挪四次，够用了
      for (let k = 0; k < 4; k++) {
        const hit = rects.find(
          (rc) => left - CLEAR < rc.r && left + w + CLEAR > rc.l && cy + h / 2 > rc.t - CLEAR && cy - h / 2 < rc.b + CLEAR,
        )
        if (!hit) break
        const up = Math.max(TOP, hit.t - CLEAR - h / 2)
        const down = Math.min(box.h - BOTTOM, hit.b + CLEAR + h / 2)
        cy = Math.abs(up - cy) <= Math.abs(down - cy) ? up : down
      }

      // 两个标签靠太近就往下让，避免叠字
      for (const p of placed) {
        if (left < p.left + p.w + 10 && left + w + 10 > p.left && cy + h / 2 > p.top - 8 && cy - h / 2 < p.top + p.h + 8) {
          cy = p.top + p.h + 10 + h / 2
        }
      }

      cy = Math.min(Math.max(TOP, cy), box.h - BOTTOM)

      // 引线从标签朝向星核的那条边出发，长度跟着距离走。
      // 留 4px 让开字面，否则圆点会正好压住第一个字。
      const ex = L.cx > left + w / 2 ? left + w + 4 : left - 4
      const ey = cy
      const dx = L.cx - ex
      const dy = L.cy - ey
      const dist = Math.hypot(dx, dy) || 1
      const len = Math.min(70, Math.max(24, dist * 0.26))

      placed.push({ left, top: cy - h / 2, w, h, ex, ey, tx: ex + (dx / dist) * len, ty: ey + (dy / dist) * len })
    })

    return placed
  }, [box, sizes, rects, items])

  const ready = marks.length === items.length

  return (
    <div ref={hostRef} className={cn('orbit-nav', ready && 'is-ready')}>
      <svg className="orbit-svg" aria-hidden="true">
        {marks.map((m, i) => (
          <g key={items[i].to}>
            <line x1={m.ex} y1={m.ey} x2={m.tx} y2={m.ty} style={{ stroke: hover === i ? 'var(--ol-hot)' : 'var(--ol)' }} />
            <circle cx={m.ex} cy={m.ey} r={hover === i ? 2.5 : 1.8} style={{ fill: hover === i ? 'var(--ol-hot)' : 'var(--ol)' }} />
          </g>
        ))}
      </svg>

      {items.map((it, i) => {
        const m = marks[i]
        return (
          <Link
            key={it.to}
            to={it.to}
            className={cn('orbit-item', it.quiet && 'is-quiet')}
            style={{ left: m ? m.left : -9999, top: m ? m.top : -9999, width: m ? m.w : undefined }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
          >
            <b>{it.name}</b>
            {it.tag ? <em>{it.tag}</em> : null}
            {it.count ? <i className="orbit-count">{it.count}</i> : null}
          </Link>
        )
      })}
    </div>
  )
}
