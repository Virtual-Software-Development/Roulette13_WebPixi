// Single source of truth for how `npm run dev:all` wires this repo to its sibling Go backend
// (quick-money-backend). Every dev launcher (run-backend, run-app, run-admin, check-ports) reads
// ports/URLs from here instead of hardcoding them, so the two projects can evolve independently:
// changing HTTP_PORT or DB_* in the backend's own .env is picked up without touching this repo.
//
// Precedence for anything configurable: process.env > this repo's .env files > backend .env > default.

import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = path.resolve(__dirname, '../..')
export const ADMIN_DIR = path.join(REPO_ROOT, 'admin')

// Sibling checkout by default (two separate git projects), overridable for other layouts.
export const BACKEND_DIR = process.env.BACKEND_DIR
  ? path.resolve(process.env.BACKEND_DIR)
  : path.resolve(REPO_ROOT, '..', 'quick-money-backend')
export const BACKEND_ENV_FILE = path.join(BACKEND_DIR, '.env')

// Pinned in vite.config.ts / admin/vite.config.ts (strictPort), so they're constants here too.
export const APP_PORT = 5173
export const ADMIN_PORT = 4100
const DEFAULT_API_PORT = '3000'

export function readEnvFile(file) {
  try {
    return parseEnv(fs.readFileSync(file, 'utf8'))
  } catch {
    return {}
  }
}

export function hasBackend() {
  return fs.existsSync(path.join(BACKEND_DIR, 'go.mod'))
}

// Re-read on demand (not cached) so a restart after editing the backend's .env sees the new values.
export function loadBackendConfig() {
  const env = { ...readEnvFile(BACKEND_ENV_FILE), ...process.env }
  const db = {
    host: env.DB_HOST || 'localhost',
    port: env.DB_PORT || '5432',
    user: env.DB_USER || '',
    password: env.DB_PASSWORD || '',
    name: env.DB_NAME || '',
    sslmode: env.DB_SSLMODE || 'disable',
  }
  const databaseUrl =
    `postgres://${encodeURIComponent(db.user)}:${encodeURIComponent(db.password)}` +
    `@${db.host}:${db.port}/${encodeURIComponent(db.name)}?sslmode=${db.sslmode}`
  return { db, databaseUrl, apiPort: env.HTTP_PORT || DEFAULT_API_PORT }
}

export function apiPort() {
  return loadBackendConfig().apiPort
}

// Where the root app's /api proxy points. vite.config.ts appends /api/v1 itself, so this is the
// bare origin. An explicit API_URL (env or root .env) wins, e.g. to target a remote backend.
export function rootApiUrl() {
  return process.env.API_URL || readEnvFile(path.join(REPO_ROOT, '.env')).API_URL || `http://localhost:${apiPort()}`
}

// The admin app proxies /api and /media through the root app (which owns local-media and the
// /api -> /api/v1 rewrite), unless admin/.env says otherwise.
export function adminApiUrl() {
  return readEnvFile(path.join(ADMIN_DIR, '.env')).API_URL || `http://localhost:${APP_PORT}`
}

function canConnect(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port: Number(port), timeout: 500 })
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('error', () => resolve(false))
  })
}

// Checks both loopback families for localhost: Vite on Windows binds ::1 only, the Go API binds v4.
export async function isPortOpen(host, port) {
  if (host !== 'localhost') return canConnect(host, port)
  const [v4, v6] = await Promise.all([canConnect('127.0.0.1', port), canConnect('::1', port)])
  return v4 || v6
}

// Resolves true once the port accepts connections, false on timeout (Infinity = wait forever)
// or as soon as isAlive() returns false.
export async function waitForPort(host, port, { timeoutMs = Infinity, isAlive = () => true } = {}) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline && isAlive()) {
    if (await isPortOpen(host, port)) return true
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return false
}
