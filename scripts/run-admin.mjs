#!/usr/bin/env node
// ADMIN process of `npm run dev:all`: waits for its dependencies, then starts admin/'s Vite dev
// server. Admin proxies /api and /media through the root app (see devEnv.adminApiUrl), so the
// root app is a hard requirement. The backend wait is soft -- run-backend.mjs may have skipped it
// (no checkout, DB down) and admin must not hang forever in that case.

import path from 'node:path'
import { spawn } from 'node:child_process'
import { ADMIN_DIR, APP_PORT, adminApiUrl, apiPort, waitForPort } from './lib/devEnv.mjs'

await waitForPort('localhost', APP_PORT)

if (!(await waitForPort('localhost', apiPort(), { timeoutMs: 30_000 }))) {
  console.warn(`\n[run-admin] Backend on :${apiPort()} did not come up within 30s -- starting admin anyway.`)
  console.warn('[run-admin] Login and other /api calls will fail until it is reachable.\n')
}

const apiUrl = adminApiUrl()
console.log(`[run-admin] /api, /media -> ${apiUrl}`)

// API_URL is passed explicitly because Vite gives process.env priority over admin/.env anyway.
const child = spawn(process.execPath, [path.join(ADMIN_DIR, 'node_modules', 'vite', 'bin', 'vite.js'), ...process.argv.slice(2)], {
  cwd: ADMIN_DIR,
  stdio: 'inherit',
  env: { ...process.env, API_URL: apiUrl },
})
child.on('exit', (code) => process.exit(code ?? 1))
