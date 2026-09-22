import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 4100,
      proxy: {
        '/api': {
          target: env.API_URL ?? 'http://localhost:4000',
          changeOrigin: true,
        },
        // The ported admin dashboard components (AdminSidebar icons, RTP arrow icon, etc.) reference
        // media assets via the same buildMediaUrl('Website_svg_icons/...') helper the root app uses
        // -- proxied to the same origin (root app's dev server / server.js) rather than duplicating
        // local-media/ into this project.
        '/media': {
          target: env.API_URL ?? 'http://localhost:4000',
          changeOrigin: true,
        },
        '/media-list': {
          target: env.API_URL ?? 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
    },
  }
})
