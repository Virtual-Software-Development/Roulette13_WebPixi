/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { createMediaHandler, createMediaListHandler } from './server/mediaHandler.js'
import { createTerminalInfoHandler } from './server/terminalInfo.js'
import { createInternetCheckHandler } from './server/internetCheck.js'

function localMediaPlugin(mediaRoot: string): Plugin {
  return {
    name: 'local-media',
    configureServer(server) {
      server.middlewares.use(createMediaHandler({ mediaRoot }))
      server.middlewares.use(createMediaListHandler({ mediaRoot }))
      // MAC de esta computadora para pedir las credenciales MQTT (ver server/terminalInfo.js).
      server.middlewares.use(createTerminalInfoHandler())
      // ¿Hay salida a internet? (ver server/internetCheck.js).
      server.middlewares.use(createInternetCheckHandler())
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
          // `||`, not `??`: .env.example ships an empty API_URL=, which must fall back too.
          // Under `npm run dev:all`, scripts/run-app.mjs sets API_URL from the backend's HTTP_PORT.
          target: env.API_URL || 'http://localhost:3000',
          changeOrigin: true,
          // Backend routes live under /api/v1 (quick_money-backend's router.go).
          rewrite: (path) => path.replace(/^\/api/, '/api/v1'),
        },
        // MQTT sobre WebSocket hacia EMQX (listener ws en 8083, path /mqtt) -- ver
        // src/mqtt/mqttConnection.ts.
        '/mqtt': {
          target: env.MQTT_WS_URL || 'ws://localhost:8083',
          ws: true,
          changeOrigin: true,
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
