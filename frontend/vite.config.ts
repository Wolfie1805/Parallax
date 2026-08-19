import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    assetsInclude: ['**/*.glsl'],

    // Make VITE_* env vars available in client code via import.meta.env
    // (Vite does this automatically; this define block is for documentation/clarity)
    define: {
      // nothing extra needed — Vite exposes VITE_* vars automatically
    },

    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/ws': {
          target: (env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/^http/, 'ws'),
          ws: true,
        },
      },
    },

    preview: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/ws': {
          target: (env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/^http/, 'ws'),
          ws: true,
        },
      },
    },
  }
})
