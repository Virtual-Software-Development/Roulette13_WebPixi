/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { createMediaHandler, createMediaListHandler } from './server/mediaHandler.js'

function localMediaPlugin(mediaRoot: string): Plugin {
  return {
    name: 'local-media',
    configureServer(server) {
      server.middlewares.use(createMediaHandler({ mediaRoot }))
      server.middlewares.use(createMediaListHandler({ mediaRoot }))
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), localMediaPlugin(env.MEDIA_ROOT ?? './local-media')],
    server: {
      // Pinned (rather than Vite's default auto-increment-on-conflict) so the admin app's dev
      // proxy (admin/.env: API_URL) can reliably point here — a silent port bump to 5174 would
      // otherwise break that without any obvious error.
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.API_URL ?? 'http://localhost:3000',
          changeOrigin: true,
          // Backend routes live under /api/v1 (quick_money-backend's router.go).
          rewrite: (path) => path.replace(/^\/api/, '/api/v1'),
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      server: {
        deps: {
          inline: ['@pixi/react', 'react-reconciler'],
        },
      },
    },
  }
})
