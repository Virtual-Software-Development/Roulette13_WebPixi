// Starts the local EMQX (MQTT broker) for `npm run dev:all` when the broker isn't already answering -- same idea as lib/postgres.mjs, so it no longer has to
// be started by hand with `C:\emqx\bin\emqx.cmd console`. Tried in order:
//
//   1. Windows: the zip install from the backend README (EMQX_HOME, default C:\emqx), started with
//      `emqx.cmd start`. That runs the node detached (no window) and it keeps running after
//      dev:all stops, like the PostgreSQL service; stop it with `C:\emqx\bin\emqx.cmd stop`.
//   2. Docker: the backend's own deploy/docker-compose.yml `emqx` service.
//
// The EMQX config (backend auth/ACL hooks, service user) lives in EMQX's own data dir, so it only
// has to be set up once with the backend's scripts/emqx-setup.ps1 -- this never touches it.
//
// Never throws and never exits. Only for a local MQTT_HOST -- a remote broker is never touched.
// Opt out with DEV_START_MQTT=0.

import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { BACKEND_DIR, BACKEND_ENV_FILE, isPortOpen, readEnvFile, waitForPort } from './devEnv.mjs'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

// Backend .env: MQTT_HOST + MQTT_PORT (see quick-money-backend internal/config).
function brokerAddress(env) {
  return { host: env.MQTT_HOST || '127.0.0.1', port: env.MQTT_PORT || '1883' }
}

function startWindowsZip(log) {
  const emqxHome = process.env.EMQX_HOME || 'C:\\emqx'
  const emqxCmd = path.join(emqxHome, 'bin', 'emqx.cmd')
  if (!fs.existsSync(emqxCmd)) return false

  log(`Starting EMQX (${emqxCmd} start)...`)
  // stdio 'ignore' matters: the detached Erlang node inherits the handles, so a pipe here would
  // never close and anything waiting on it would hang.
  const child = spawn('cmd.exe', ['/c', emqxCmd, 'start'], { detached: true, stdio: 'ignore', windowsHide: true })
  child.on('error', () => {})
  child.unref()
  return true
}

function startDocker(log, warn) {
  const composeFile = path.join(BACKEND_DIR, 'deploy', 'docker-compose.yml')
  if (!fs.existsSync(composeFile)) return false
  if (spawnSync('docker', ['version'], { stdio: 'ignore' }).status !== 0) return false

  log('Starting EMQX with docker compose (backend deploy/docker-compose.yml)...')
  const args = ['compose', '-f', composeFile]
  if (fs.existsSync(BACKEND_ENV_FILE)) args.push('--env-file', BACKEND_ENV_FILE)
  args.push('up', '-d', 'emqx')
  const result = spawnSync('docker', args, { cwd: BACKEND_DIR, stdio: 'inherit' })
  if (result.status !== 0) warn('docker compose could not start the emqx service.')
  return result.status === 0
}

export async function startLocalEmqx({ log, warn }) {
  if (process.env.DEV_START_MQTT === '0') return
  const env = { ...readEnvFile(BACKEND_ENV_FILE), ...process.env }

  const address = brokerAddress(env)
  if (!LOCAL_HOSTS.has(address.host)) return
  if (await isPortOpen(address.host, address.port)) {
    log(`EMQX already up on ${address.host}:${address.port}.`)
    return
  }

  const started = (process.platform === 'win32' && startWindowsZip(log)) || startDocker(log, warn)
  if (!started) {
    warn(`No EMQX is answering on ${address.host}:${address.port} and none was found to start.`)
    warn('Install it as the backend README says (C:\\emqx, or set EMQX_HOME), or use Docker. Terminals will show the connection error screen until then.')
    return
  }
  if (await waitForPort(address.host, address.port, { timeoutMs: 60_000 })) {
    log(`EMQX ready on ${address.host}:${address.port} (WebSocket :8083, dashboard http://localhost:18083).`)
  } else {
    warn(`EMQX did not open ${address.host}:${address.port} within 60s -- check ${process.env.EMQX_HOME || 'C:\\emqx'}\\log.`)
  }
}
