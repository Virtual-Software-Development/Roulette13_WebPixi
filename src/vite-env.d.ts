/// <reference types="vite/client" />

// Inyectados por vite.config.ts (define) -- ver src/appSurface.ts.
declare const __APP_SURFACE__: 'admin' | 'game' | 'betting' | 'all'
declare const __ADMIN_PORT__: number
declare const __GAME_PORT__: number
declare const __BETTING_PORT__: number
// true solo con `npm run dev:lan` (ver src/lanPreview.ts).
declare const __LAN_PREVIEW__: boolean

interface ImportMetaEnv {
  readonly VITE_API_KEY: string
  readonly VITE_MQTT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
