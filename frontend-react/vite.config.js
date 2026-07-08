import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const backendTarget = env.VITE_BACKEND_URL || 'http://localhost:8000'

  return {
    plugins: [react()],
    build: {
      manifest: true,
    },
    server: {
      fs: {
        allow: ['..'],
      },
      proxy: {
        '^/api/(?!(demo|admin)(?:/|$)).*': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/accounts': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/consultation': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/login': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/like': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/logout': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/register': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/activate': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/verify': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/properties': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/media': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/static': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/test/map/interactive/data': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/api/settings': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/api/telegram-templates': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
