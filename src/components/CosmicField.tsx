/**
 * 星河：首页背景的粒子星系。
 *
 * 设计约束：
 * 1. 只是背景，不承载任何信息，所以永远 pointer-events:none、不进 tab 序。
 * 2. 深色主题是"黑底上的星"，浅色主题反过来是"白底上的墨"，两边都要好看。
 * 3. 低端机要能跑：粒子数按面积和 CPU 核数收敛，滚出视口或切到后台立刻停帧。
 * 4. 用户开了"减少动态效果"就只画一帧静态图，不再 rAF。
 */
import { useEffect, useRef } from 'react'
import { cosmosLayout } from '@/lib/cosmos'

type RGB = [number, number, number]

/** 深色：冷白 + 蓝紫 + 青，末尾两色是粉与暖白，用来点缀不同温度的点 */
const PALETTE_DARK: RGB[] = [
  [30, 200, 240],
  [70, 140, 255],
  [120, 92, 255],
  [180, 140, 255],
  [255, 110, 175],
  [255, 250, 240],
]

/** 浅色：白底上叠深色会糊，所以整体压暗、饱和度降低，走"墨点星图"的路子 */
const PALETTE_LIGHT: RGB[] = [
  [60, 120, 200],
  [96, 84, 210],
  [124, 92, 255],
  [110, 90, 190],
  [190, 90, 140],
  [70, 78, 110],
]

interface Particle {
  th: number
  r: number
  sp: number
  a: number
  s: number
  pi: number
  ox: number
  oy: number
}

const ARMS = 2
const PITCH = 1.22
const TAU = Math.PI * 2

function randn(): number {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v)
}

function makeSprite(rgb: RGB): HTMLCanvasElement {
  const S = 32
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')
  if (!g) return c
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  const rgbStr = `${rgb[0]},${rgb[1]},${rgb[2]}`
  grad.addColorStop(0, `rgba(${rgbStr},1)`)
  grad.addColorStop(0.16, `rgba(${rgbStr},0.62)`)
  grad.addColorStop(0.4, `rgba(${rgbStr},0.13)`)
  grad.addColorStop(1, `rgba(${rgbStr},0)`)
  g.fillStyle = grad
  g.fillRect(0, 0, S, S)
  return c
}

export function CosmicField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const rawCanvas = canvasRef.current
    if (!rawCanvas) return
    const rawCtx = rawCanvas.getContext('2d')
    if (!rawCtx) return

    // 收窄后的别名：下面的绘制函数是函数声明，会被提升，闭包里拿不到上面的收窄结果
    const canvas: HTMLCanvasElement = rawCanvas
    const ctx: CanvasRenderingContext2D = rawCtx

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isLight = document.documentElement.classList.contains('light')

    const palette = isLight ? PALETTE_LIGHT : PALETTE_DARK
    const sprites = palette.map(makeSprite)
    const blend: GlobalCompositeOperation = isLight ? 'source-over' : 'lighter'

    let W = 0
    let H = 0
    let DPR = 1
    let cx = 0
    let cy = 0
    let maxR = 0
    let cosT = 1
    let sinT = 0
    let flat = 0.58

    let particles: Particle[] = []
    let starLayer: HTMLCanvasElement | null = null

    const pointer = { x: -9999, y: -9999, active: false }
    let raf = 0
    let last = 0

    /**
     * 粒子数：按面积折算，再按核数打折。
     * 4 核以下的老机型给 55%，避免满屏星星换来 20fps。
     */
    function budget(wide: boolean): number {
      const cores = navigator.hardwareConcurrency || 4
      const base = wide ? 4600 : 2200
      const scale = cores <= 4 ? 0.55 : cores <= 6 ? 0.78 : 1
      return Math.round(base * scale)
    }

    function build(wide: boolean) {
      const target = budget(wide)
      const rMin = wide ? 0.055 : 0.17
      particles = []

      for (let i = 0; i < target; i++) {
        const u = Math.random()
        let r: number
        let th: number
        let halo = false
        let bulge = false

        if (u < 0.26) {
          // 核球：二维高斯，越靠近中心越亮
          bulge = true
          r = maxR * 0.26 * Math.abs(randn()) * 0.66
          th = Math.random() * TAU
        } else if (u < 0.9) {
          // 旋臂：对数螺线，横向抖动随半径变宽
          const q = Math.pow(Math.random(), 0.58)
          r = maxR * (rMin + (1 - rMin) * q)
          const arm = Math.random() < 0.5 ? 0 : Math.PI
          const sigma = (0.1 + 0.34 * Math.pow(r / maxR, 1.7)) * (wide ? 1 : 0.72)
          th = arm + Math.log(Math.max(r, 1) / (maxR * rMin)) / PITCH + randn() * sigma
        } else {
          // 外围晕：极稀疏，负责拉出景深
          halo = true
          r = maxR * (0.35 + 0.9 * Math.random())
          th = Math.random() * TAU
        }

        const edge = Math.min(r / maxR, 1)
        const pi = Math.random()
        const idx = bulge
          ? pi > 0.5
            ? 5
            : pi > 0.2
              ? 3
              : 2
          : halo
            ? pi > 0.5
              ? 1
              : 0
            : pi > 0.98
              ? 5
              : pi > 0.93
                ? 4
                : pi > 0.68
                  ? 3
                  : pi > 0.43
                    ? 2
                    : pi > 0.23
                      ? 1
                      : 0

        particles.push({
          th,
          r,
          sp: (0.00005 + 0.00046 / (1 + r / 26)) * (Math.random() > 0.5 ? 1 : -0.55),
          // 白底上叠同样的透明度会显得脏且淡，浅色主题统一提亮一点
          a:
            (0.26 + Math.random() * 0.64) *
            (halo ? 0.26 : 1) *
            (0.72 + 0.28 * (1 - edge * edge)) *
            (isLight ? 1.35 : 1),
          s: halo ? 1.6 + Math.random() * 2 : 2.2 + Math.random() * 4.6 * (1 - edge * 0.38),
          pi: idx,
          ox: 0,
          oy: 0,
        })
      }
    }

    /** 远景恒星单独烤一张图，每帧只贴一次，比逐点画便宜得多 */
    function buildStars(wide: boolean) {
      const s = document.createElement('canvas')
      s.width = Math.max(1, Math.round(W))
      s.height = Math.max(1, Math.round(H))
      const g = s.getContext('2d')
      if (!g) return
      const n = wide ? 260 : 150
      for (let i = 0; i < n; i++) {
        g.globalAlpha = (isLight ? 0.5 : 1) * (0.06 + Math.random() * 0.3)
        g.fillStyle = isLight ? '#2A3350' : Math.random() < 0.3 ? '#A8C8FF' : '#FFFFFF'
        g.beginPath()
        g.arc(Math.random() * W, Math.random() * H, Math.random() < 0.86 ? 0.6 : 1.1, 0, TAU)
        g.fill()
      }
      starLayer = s
    }

    function layout() {
      const rect = canvas.getBoundingClientRect()
      DPR = Math.min(window.devicePixelRatio || 1, 2)
      W = rect.width
      H = rect.height
      if (!W || !H) return
      canvas.width = Math.round(W * DPR)
      canvas.height = Math.round(H * DPR)
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)

      const geo = cosmosLayout(W, H)
      const wide = geo.wide
      cx = geo.cx
      cy = geo.cy
      maxR = geo.maxR

      // 竖屏空间小，把盘面摊平一点才看得出旋臂走向
      const tilt = wide ? -0.22 : -0.1
      flat = wide ? 0.58 : 0.8
      cosT = Math.cos(tilt)
      sinT = Math.sin(tilt)

      buildStars(wide)
      build(wide)
    }

    function frame(now: number) {
      if (!last) last = now
      const dt = Math.min(now - last, 48)
      last = now

      ctx.clearRect(0, 0, W, H)
      if (starLayer) {
        ctx.globalAlpha = 1
        ctx.drawImage(starLayer, 0, 0, W, H)
      }
      ctx.globalCompositeOperation = blend

      const px = pointer.x
      const py = pointer.y
      const pullR = Math.max(maxR * 1.05, 150)
      const pullR2 = pullR * pullR

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.th += p.sp * dt

        const lx = Math.cos(p.th) * p.r
        const ly = Math.sin(p.th) * p.r * flat
        const ex = cx + lx * cosT - ly * sinT
        const ey = cy + lx * sinT + ly * cosT

        if (pointer.active) {
          const dx = px - ex
          const dy = py - ey
          const d2 = dx * dx + dy * dy
          if (d2 < pullR2) {
            const f = 1 - Math.sqrt(d2) / pullR
            const f3 = f * f * f
            p.ox += dx * f3 * 0.115 - dy * f3 * 0.045
            p.oy += dy * f3 * 0.115 + dx * f3 * 0.045
          }
        }
        p.ox *= 0.932
        p.oy *= 0.932

        ctx.globalAlpha = p.a
        const s = p.s
        ctx.drawImage(sprites[p.pi], ex + p.ox - s * 0.5, ey + p.oy - s * 0.5, s, s)
      }

      // 星系核：外晕 → 主辉光 → 白热核
      let coreS = maxR * 0.52
      ctx.globalAlpha = isLight ? 0.12 : 0.3
      ctx.drawImage(sprites[1], cx - coreS * 0.5, cy - coreS * 0.34, coreS, coreS * 0.68)

      coreS = maxR * 0.22
      ctx.globalAlpha = isLight ? 0.22 : 0.55
      ctx.drawImage(sprites[5], cx - coreS * 0.5, cy - coreS * 0.34, coreS, coreS * 0.68)

      coreS = maxR * 0.075
      ctx.globalAlpha = isLight ? 0.4 : 0.9
      ctx.drawImage(sprites[5], cx - coreS * 0.5, cy - coreS * 0.32, coreS, coreS * 0.64)

      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      raf = requestAnimationFrame(frame)
    }

    function start() {
      if (raf || reduced) return
      last = 0
      raf = requestAnimationFrame(frame)
    }

    function stop() {
      if (!raf) return
      cancelAnimationFrame(raf)
      raf = 0
    }

    /** 减少动效时只出一帧静态图，位置和亮度都还在，只是不动 */
    function still() {
      cancelAnimationFrame(raf)
      raf = 0
      ctx.clearRect(0, 0, W, H)
      if (starLayer) ctx.drawImage(starLayer, 0, 0, W, H)
      ctx.globalCompositeOperation = blend
      for (const p of particles) {
        const lx = Math.cos(p.th) * p.r
        const ly = Math.sin(p.th) * p.r * flat
        const ex = cx + lx * cosT - ly * sinT
        const ey = cy + lx * sinT + ly * cosT
        ctx.globalAlpha = p.a
        ctx.drawImage(sprites[p.pi], ex - p.s * 0.5, ey - p.s * 0.5, p.s, p.s)
      }
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }

    // 只有精确指针才做"黑洞吸附"，触摸屏上手指就是遮挡物，吸过去纯属添乱
    const finePointer = window.matchMedia('(pointer: fine)').matches
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      pointer.x = e.clientX - r.left
      pointer.y = e.clientY - r.top
      pointer.active = pointer.y > -80 && pointer.y < r.height + 80
    }
    const onLeave = () => {
      pointer.active = false
      pointer.x = -9999
      pointer.y = -9999
    }

    const ro = new ResizeObserver(() => {
      layout()
      if (reduced) still()
    })
    ro.observe(canvas)

    let io: IntersectionObserver | null = null
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) start()
          else stop()
        },
        { threshold: 0.02 },
      )
      io.observe(canvas)
    }

    const onVisibility = () => {
      if (document.hidden) stop()
      else start()
    }
    document.addEventListener('visibilitychange', onVisibility)

    if (finePointer) {
      window.addEventListener('pointermove', onMove, { passive: true })
      window.addEventListener('pointerleave', onLeave, { passive: true })
    }

    layout()
    if (reduced) still()
    else start()

    return () => {
      stop()
      ro.disconnect()
      io?.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
