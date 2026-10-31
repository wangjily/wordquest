/**
 * 安卓壳（Capacitor）适配层。
 *
 * 网页和 App 共用同一份前端代码，这里只处理「原生才有」的三件事：
 * 启动屏、状态栏、物理返回键。浏览器里所有函数都直接返回，零副作用。
 *
 * 插件一律用动态 import：Web 端不会为几个插件多背一份首屏体积。
 */
import { Capacitor } from '@capacitor/core'

export const isNative = Capacitor.isNativePlatform()

let splashHidden = false
let splashFallback: number | undefined

/**
 * 启动屏兜底。
 * 原生启动图会一直盖着，直到 JS 主动 hide。万一语料加载卡住或 JS 报错，
 * 用户看到的就是一块永远不变的图。所以给一个硬超时，到点强制揭开。
 */
export function armSplashFallback(ms = 8000) {
  if (!isNative || splashFallback) return
  splashFallback = window.setTimeout(() => void hideSplash(), ms)
}

export async function hideSplash() {
  if (!isNative || splashHidden) return
  splashHidden = true
  if (splashFallback) window.clearTimeout(splashFallback)
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide({ fadeOutDuration: 200 })
  } catch {
    /* 插件缺失时忽略：启动图会随 Activity 一起被 WebView 覆盖 */
  }
}

function toast(key: string) {
  window.dispatchEvent(new CustomEvent('wq:toast', { detail: key }))
}

/**
 * 返回键：页面内先回退，到首页再按一次退出。
 * 不直接 exitApp，是因为误触退出会打断练习，得给一次反悔机会。
 */
async function bindBackButton() {
  try {
    const { App } = await import('@capacitor/app')
    let lastBack = 0
    await App.addListener('backButton', ({ canGoBack }) => {
      const atRoot = !window.location.hash || window.location.hash === '#/'
      if (!atRoot) {
        window.history.back()
        return
      }
      if (canGoBack && window.history.length > 1) {
        window.history.back()
        return
      }
      const now = Date.now()
      if (now - lastBack < 2000) {
        void App.exitApp()
        return
      }
      lastBack = now
      toast('exit')
    })
  } catch {
    /* 没有 App 插件时交给系统默认行为 */
  }
}

async function bindStatusBar() {
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    // 不让 WebView 顶到状态栏下面：省掉一整套安全区适配，视觉上和原生应用一致
    await StatusBar.setOverlaysWebView({ overlay: false })
    await StatusBar.setBackgroundColor({ color: '#080B14' })
    await StatusBar.setStyle({ style: Style.Dark })
  } catch {
    /* 忽略：主题里已经兜了底色 */
  }
}

/** 在 App 启动时调一次 */
export async function initNative() {
  if (!isNative) return
  armSplashFallback()
  await Promise.all([bindStatusBar(), bindBackButton()])
}
