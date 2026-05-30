import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Emit sourcemaps so production stack traces can be deminified.
    sourcemap: true,
    // Heavy pages are now lazy-loaded so the initial chunk should fit
    // comfortably under this threshold.
    chunkSizeWarningLimit: 600,
  },
  // Vite 8 uses the Oxc minifier. Strip debug noise from production bundles only.
  oxc:
    mode === 'production'
      ? {
          jsx: { development: false },
          drop: ['console', 'debugger'],
        }
      : {},
}))
