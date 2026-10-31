import type { CapacitorConfig } from '@capacitor/cli'

/**
 * 安卓壳配置。
 *
 * androidScheme: 'https' —— 页面源是 https://localhost，属于安全上下文，
 * 这样 localStorage 稳定、外部 https 音频不会被当作混合内容拦截。
 * （不能用 http，否则百度/有道的 https 音频会被 WebView 判为 mixed content。）
 */
const config: CapacitorConfig = {
  appId: 'com.wordquest.app',
  appName: '词跃',
  webDir: 'dist',
  android: {
    backgroundColor: '#080B14',
    allowMixedContent: false,
    // 正式包关掉远程调试；本地排查时临时改 true 再用 chrome://inspect
    webContentsDebuggingEnabled: false,
  },
  server: {
    androidScheme: 'https',
  },
}

export default config
