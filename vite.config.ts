import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // 大纲全量词表单独成块：体积大但几乎不变，能长期命中浏览器缓存
        manualChunks(id) {
          if (id.includes('src/data/dicts/')) return 'dicts'
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react'
          return undefined
        },
      },
    },
  },
  server: {
    port: 5173,
  },
})
