import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Defaults to the root app's dev server, which owns local-media and rewrites /api -> /api/v1 to
  // the backend. `||`, not `??`: .env.example ships an empty API_URL=, which must fall back too.
  // Against `npm run serve` (server.js on :4000) instead, set API_URL=http://localhost:4000 in admin/.env.
  const apiUrl = env.API_URL || 'http://localhost:5173'

  return {
    plugins: [react()],
    server: {
      port: 4100,
      // Pinned like the root app's 5173, so scripts/lib/devEnv.mjs (ADMIN_PORT) and check-ports stay right.
      strictPort: true,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
        // The ported admin dashboard components (AdminSidebar icons, RTP arrow icon, etc.) reference
        // media assets via the same buildMediaUrl('Website_svg_icons/...') helper the root app uses
        // -- proxied to the same origin (root app's dev server / server.js) rather than duplicating
        // local-media/ into this project.
        '/media': {
          target: apiUrl,
          changeOrigin: true,
        },
        '/media-list': {
          target: apiUrl,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
    },
  }
})
