#!/usr/bin/env node
// APP process of `npm run dev:all`: the root game frontend's Vite dev server, with its /api proxy
// pointed at the backend port from scripts/lib/devEnv.mjs (the backend's own HTTP_PORT) unless
// API_URL is set explicitly in the environment or this repo's .env.
//
// Waits for the backend before starting Vite, like run-admin.mjs: otherwise a browser tab already
// open on :5173 reconnects instantly and its first /api requests hit a backend that is still
// building/migrating, flooding the log with ECONNREFUSED proxy errors. The wait is soft --
// run-backend.mjs may have skipped the backend (no checkout, DB down), so after the timeout the app
// starts anyway.

import path from 'node:path'
import { spawn } from 'node:child_process'
import { REPO_ROOT, apiPort, rootApiUrl, waitForPort } from './lib/devEnv.mjs'

if (!(await waitForPort('localhost', apiPort(), { timeoutMs: 30_000 }))) {
  console.warn(`\n[run-app] Backend on :${apiPort()} did not come up within 30s -- starting the app anyway.`)
  console.warn('[run-app] /api calls will fail until it is reachable.\n')
}

const apiUrl = rootApiUrl()
console.log(`[run-app] /api -> ${apiUrl}/api/v1`)

const child = spawn(process.execPath, [path.join(REPO_ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), ...process.argv.slice(2)], {
  cwd: REPO_ROOT,
  stdio: 'inherit',
  env: { ...process.env, API_URL: apiUrl },
})
child.on('exit', (code) => process.exit(code ?? 1))
