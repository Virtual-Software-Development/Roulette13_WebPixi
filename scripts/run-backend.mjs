#!/usr/bin/env node
// BACKEND process of `npm run dev:all`: supervises the Go API from the sibling quick-money-backend
// checkout (location/ports/DB settings come from scripts/lib/devEnv.mjs, i.e. the backend's own .env).
//
//   1. makes sure PostgreSQL (DB_HOST/DB_PORT) is up: if it isn't answering and DB_HOST is local, it
//      starts it (Windows service, else the backend's docker compose -- see lib/postgres.mjs),
//      then waits for it
//   2. applies pending migrations (golang-migrate `up`, same pinned version as the backend Makefile)
//   3. builds and runs cmd/api
//   4. watches the backend: .go/go.mod/go.sum/.env changes rebuild + restart the API, and
//      db/migrations/*.sql changes also re-run migrations first
//
// Never fatal: dev:all runs this under `--kill-others-on-fail`, so exiting non-zero would take
// both frontends down with it. A missing checkout or missing `go` exits 0 with a warning;
// a DB/migration/build problem is logged and retried on the next backend change instead.

import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { BACKEND_DIR, BACKEND_ENV_FILE, REPO_ROOT, hasBackend, loadBackendConfig, waitForPort } from './lib/devEnv.mjs'
import { startLocalPostgres } from './lib/postgres.mjs'

const MIGRATE_MODULE = 'github.com/golang-migrate/migrate/v4/cmd/migrate@v4.18.1'
const isWindows = process.platform === 'win32'

const log = (message) => console.log(`[run-backend] ${message}`)
const warn = (message) => console.warn(`[run-backend] ${message}`)

if (!hasBackend()) {
  warn(`No Go backend found at ${BACKEND_DIR} (no go.mod there).`)
  warn('Skipping it -- the frontends will still start, but /api requests will 502 until a backend is running.')
  warn('Clone quick-money-backend next to this repo, or point BACKEND_DIR at your checkout.')
  process.exit(0)
}
if (spawnSync('go', ['version']).error) {
  warn('`go` is not on PATH -- skipping the backend. Install Go (https://go.dev/dl/) and restart dev:all.')
  process.exit(0)
}
if (!fs.existsSync(BACKEND_ENV_FILE)) {
  warn(`Missing ${BACKEND_ENV_FILE} -- copy the backend's .env.example to .env and fill it in. Using defaults for now.`)
}

let config = loadBackendConfig()

// --- API process -------------------------------------------------------------

// Built to a binary instead of `go run` so stopping dev:all kills the real API, not just the
// `go` wrapper (which leaves an orphan holding the port on Windows). Built to a separate file and
// then copied because Windows won't let you overwrite a running .exe.
const cacheDir = path.join(REPO_ROOT, 'node_modules', '.cache', 'run-backend')
const exe = isWindows ? '.exe' : ''
const apiBinary = path.join(cacheDir, `api${exe}`)
const apiBuildOutput = path.join(cacheDir, `api-build${exe}`)
let apiChild = null
let shuttingDown = false

function killTree(child) {
  if (child.exitCode !== null || child.signalCode !== null || child.pid === undefined) return
  if (isWindows) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else child.kill('SIGTERM')
}

function goSync(args) {
  const result = spawnSync('go', args, { cwd: BACKEND_DIR, encoding: 'utf8' })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
  if (output) console.log(output)
  return result.status === 0
}

function runMigrations() {
  log('Applying migrations...')
  if (goSync(['run', '-tags', 'postgres', MIGRATE_MODULE, '-path', 'db/migrations', '-database', config.databaseUrl, 'up'])) {
    return true
  }
  warn('Migrations failed (check DB_* in the backend .env). Fix it and save any backend file to retry.')
  return false
}

function buildApi() {
  log('Building cmd/api...')
  fs.mkdirSync(cacheDir, { recursive: true })
  if (goSync(['build', '-o', apiBuildOutput, './cmd/api'])) return true
  warn('Build failed -- the previous API (if any) keeps running; retrying on the next backend change.')
  return false
}

function stopApi() {
  if (!apiChild) return
  const child = apiChild
  apiChild = null
  killTree(child)
}

async function startApi() {
  fs.copyFileSync(apiBuildOutput, apiBinary)
  const child = spawn(apiBinary, [], { cwd: BACKEND_DIR, stdio: 'inherit' })
  apiChild = child
  child.on('exit', (code, signal) => {
    if (shuttingDown || apiChild !== child) return
    apiChild = null
    warn(`API exited (${signal ?? `code ${code}`}); it restarts on the next backend change.`)
  })
  if (await waitForPort('localhost', config.apiPort, { timeoutMs: 30_000, isAlive: () => apiChild === child })) {
    log(`API ready on http://localhost:${config.apiPort}`)
  } else if (apiChild === child) {
    warn(`API did not open port ${config.apiPort} within 30s.`)
  }
}

// Full cycle used both at startup and on every reload. Builds before stopping the old API, so
// a compile error never leaves you without a running backend.
let migrationsOk = false
async function cycle({ migrate }) {
  const previousPort = config.apiPort
  config = loadBackendConfig()
  if (config.apiPort !== previousPort) {
    warn(`HTTP_PORT changed (${previousPort} -> ${config.apiPort}); restart dev:all so the frontends proxy to the new port.`)
  }
  if (!buildApi()) return
  stopApi()
  if (migrate || !migrationsOk) migrationsOk = runMigrations()
  if (migrationsOk) await startApi()
}

function shutdown() {
  shuttingDown = true
  stopApi()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.on('exit', () => apiChild && killTree(apiChild))

// --- Startup -------------------------------------------------------------------

log(`Backend: ${BACKEND_DIR}`)
const { host, port } = config.db
if (!(await waitForPort(host, port, { timeoutMs: 3_000 }))) {
  const started = startLocalPostgres(host, { log, warn })
  if (!started || !(await waitForPort(host, port, { timeoutMs: 30_000 }))) {
    warn(`PostgreSQL is not answering on ${host}:${port} -- waiting for it. Start it with` +
      (isWindows
        ? ' `net start postgresql-x64-16` (as administrator), or Docker.'
        : ' `docker compose -f deploy/docker-compose.yml up postgres` in the backend.'))
    await waitForPort(host, port)
  }
}
log('PostgreSQL is up.')
await cycle({ migrate: true })

// --- Reload on backend changes ---------------------------------------------------

const IGNORED_DIRS = new Set(['.git', 'bin', 'vendor', 'node_modules', '.github'])
let pending = null // { migrate, files } accumulated during the debounce window or a running cycle
let debounceTimer = null
let reloading = false

async function reload() {
  if (reloading || !pending || shuttingDown) return
  const { migrate } = pending
  pending = null
  reloading = true
  try {
    await cycle({ migrate })
  } finally {
    reloading = false
    if (pending) reload()
  }
}

fs.watch(BACKEND_DIR, { recursive: true }, (_event, filename) => {
  if (!filename) return
  const rel = filename.split(path.sep).join('/')
  if (IGNORED_DIRS.has(rel.split('/')[0])) return

  const isMigration = rel.startsWith('db/migrations/') && rel.endsWith('.sql')
  const isGoSource = rel.endsWith('.go') || rel === 'go.mod' || rel === 'go.sum' || rel === '.env'
  if (!isMigration && !isGoSource) return

  // One save fires several events on Windows; log each file once per burst.
  if (!pending?.files.has(rel)) log(`Changed: ${rel}`)
  pending = {
    migrate: (pending?.migrate ?? false) || isMigration,
    files: (pending?.files ?? new Set()).add(rel),
  }
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(reload, 400)
})

log('Watching the backend for changes.')
