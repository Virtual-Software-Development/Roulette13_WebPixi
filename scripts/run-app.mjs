#!/usr/bin/env node
// ADMIN, GAME and BETTING processes of `npm run dev:all`: the same root frontend (src/) run as three
// Vite dev servers -- `--surface=admin` (Login + Admin Panel, :5173), `--surface=game` (roulette and
// Quick Money lobbies, :4100) and `--surface=betting` (betting views, :4200); see vite.config.ts and
// src/appSurface.ts. Without --surface it serves every
// screen on :5173, as before. The /api proxy points at the backend port from scripts/lib/devEnv.mjs
// (the backend's own HTTP_PORT) unless API_URL is set explicitly in the environment or this repo's .env.
//
// Waits for the backend before starting Vite: otherwise a browser tab already
// open on the app reconnects instantly and its first /api requests hit a backend that is still
// building/migrating, flooding the log with ECONNREFUSED proxy errors. The wait is soft --
// run-backend.mjs may have skipped the backend (no checkout, DB down), so after the timeout the app
// starts anyway.

import path from 'node:path'
import { spawn } from 'node:child_process'
import { REPO_ROOT, rootApiUrl, waitForPort } from './lib/devEnv.mjs'

// Waits on wherever /api actually points, so a remote API_URL isn't gated on a local backend.
const apiTarget = new URL(rootApiUrl())
const apiTargetPort = apiTarget.port || (apiTarget.protocol === 'https:' ? '443' : '80')
if (!(await waitForPort(apiTarget.hostname, apiTargetPort, { timeoutMs: 30_000 }))) {
  console.warn(`\n[run-app] Backend on ${apiTarget.host} did not come up within 30s -- starting the app anyway.`)
  console.warn('[run-app] /api calls will fail until it is reachable.\n')
}

const args = process.argv.slice(2)
const surfaceArg = args.find((arg) => arg.startsWith('--surface='))
const surface = surfaceArg?.slice('--surface='.length)
if (surface && !['admin', 'game', 'betting'].includes(surface)) {
  console.error(`[run-app] Unknown --surface=${surface} (expected admin, game or betting).`)
  process.exit(1)
}
const viteArgs = args.filter((arg) => arg !== surfaceArg)

const apiUrl = rootApiUrl()
console.log(`[run-app${surface ? `:${surface}` : ''}] /api -> ${apiUrl}/api/v1`)

const child = spawn(process.execPath, [path.join(REPO_ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), ...viteArgs], {
  cwd: REPO_ROOT,
  stdio: 'inherit',
  env: { ...process.env, API_URL: apiUrl, ...(surface ? { APP_SURFACE: surface } : {}) },
})
child.on('exit', (code) => process.exit(code ?? 1))
