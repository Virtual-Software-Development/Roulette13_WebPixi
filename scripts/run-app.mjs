#!/usr/bin/env node
// APP process of `npm run dev:all`: the root game frontend's Vite dev server, with its /api proxy
// pointed at the backend port from scripts/lib/devEnv.mjs (the backend's own HTTP_PORT) unless
// API_URL is set explicitly in the environment or this repo's .env.

import path from 'node:path'
import { spawn } from 'node:child_process'
import { REPO_ROOT, rootApiUrl } from './lib/devEnv.mjs'

const apiUrl = rootApiUrl()
console.log(`[run-app] /api -> ${apiUrl}/api/v1`)

const child = spawn(process.execPath, [path.join(REPO_ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), ...process.argv.slice(2)], {
  cwd: REPO_ROOT,
  stdio: 'inherit',
  env: { ...process.env, API_URL: apiUrl },
})
child.on('exit', (code) => process.exit(code ?? 1))
