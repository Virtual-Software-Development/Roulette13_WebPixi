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
      proxy: {
        '/api': {
          target: env.API_URL ?? 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
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
