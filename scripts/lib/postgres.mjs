// Starts the local PostgreSQL for `npm run dev:all` when it isn't already answering, so the
// database no longer has to be started by hand. Tried in order:
//
//   1. Windows: the installed PostgreSQL service (postgresql-x64-16 etc.). Starting a service
//      normally needs administrator rights, so if a plain start is refused it asks once via a UAC
//      prompt. Declining the prompt just falls through.
//   2. Docker: the backend's own deploy/docker-compose.yml `postgres` service, with the backend's
//      .env so DB_USER/DB_PASSWORD/DB_NAME match what the API connects with.
//
// Never throws and never exits: if nothing works, the caller falls back to waiting for the port.
// Only for a local DB_HOST -- a remote database is never touched. Opt out with DEV_START_DB=0.

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { BACKEND_DIR, BACKEND_ENV_FILE } from './devEnv.mjs'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

function powershell(command) {
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8' })
  return { ok: result.status === 0, out: (result.stdout ?? '').trim(), err: (result.stderr ?? '').trim() }
}

function findWindowsService() {
  const { ok, out } = powershell(
    "Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue | Select-Object -First 1 | " +
      "ForEach-Object { \"$($_.Name)|$($_.StartType)|$($_.Status)\" }"
  )
  if (!ok || !out) return null
  const [name, startType, status] = out.split('|')
  return { name, startType, status }
}

function startWindowsService(log, warn) {
  const service = findWindowsService()
  if (!service) return false
  if (service.startType === 'Disabled') {
    warn(`PostgreSQL service ${service.name} is disabled -- enable it in services.msc to let dev:all start it.`)
    return false
  }
  if (service.status === 'Running') return true

  log(`Starting PostgreSQL service ${service.name}...`)
  if (powershell(`Start-Service -Name '${service.name}' -ErrorAction Stop`).ok) return true

  // Not elevated: ask once through UAC. -Wait returns after sc.exe finishes; a declined prompt
  // makes Start-Process fail, which is fine.
  log('Starting a Windows service needs administrator rights -- approve the UAC prompt to continue.')
  const elevated = powershell(
    `Start-Process -FilePath sc.exe -ArgumentList 'start','${service.name}' -Verb RunAs -WindowStyle Hidden -Wait -ErrorAction Stop`
  )
  if (!elevated.ok) warn('Could not start the PostgreSQL service (UAC prompt declined or failed).')
  return elevated.ok
}

function startDocker(log, warn) {
  const composeFile = path.join(BACKEND_DIR, 'deploy', 'docker-compose.yml')
  if (!fs.existsSync(composeFile)) return false
  if (spawnSync('docker', ['version'], { stdio: 'ignore' }).status !== 0) return false

  log('Starting PostgreSQL with docker compose (backend deploy/docker-compose.yml)...')
  const args = ['compose', '-f', composeFile]
  if (fs.existsSync(BACKEND_ENV_FILE)) args.push('--env-file', BACKEND_ENV_FILE)
  args.push('up', '-d', 'postgres')
  const result = spawnSync('docker', args, { cwd: BACKEND_DIR, stdio: 'inherit' })
  if (result.status !== 0) warn('docker compose could not start the postgres service.')
  return result.status === 0
}

// Returns true if a start was issued (the caller still waits for the port to open).
export function startLocalPostgres(host, { log, warn }) {
  if (process.env.DEV_START_DB === '0') return false
  if (!LOCAL_HOSTS.has(host)) return false
  if (process.platform === 'win32' && startWindowsService(log, warn)) return true
  return startDocker(log, warn)
}
