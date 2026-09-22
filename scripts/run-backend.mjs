#!/usr/bin/env node
// Launches the Go backend (quick-money-backend) as part of `npm run dev:all`, so a fresh clone
// doesn't need a fourth manual terminal + `go run ./cmd/api` just to get real API responses instead
// of 502s. It's a sibling checkout, not a subfolder of this repo (two separate git projects), so
// its location is resolved relative to this repo's parent directory by default.
//
// Intentionally non-fatal when the backend can't be found: someone doing frontend-only work may
// not have that repo cloned at all, and dev:all should still boot the two frontends in that case
// rather than refuse to start. See package.json's dev:all, which runs this alongside APP/ADMIN
// under `--kill-others-on-fail` (not `-k`) for exactly that reason -- this script exiting 0 (found
// nothing to run) must never take the frontends down with it.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')

const backendDir = process.env.BACKEND_DIR ? path.resolve(process.env.BACKEND_DIR) : path.resolve(REPO_ROOT, '..', 'quick-money-backend')

if (!fs.existsSync(path.join(backendDir, 'go.mod'))) {
  console.warn(`\n[run-backend] No Go backend found at ${backendDir} (no go.mod there).`)
  console.warn('[run-backend] Skipping it -- the frontends will still start, but /api requests will 502 until a backend is running.')
  console.warn('[run-backend] Point BACKEND_DIR at your checkout to fix this, e.g.:')
  console.warn('[run-backend]   BACKEND_DIR=C:\\path\\to\\quick-money-backend npm run dev:all\n')
  process.exit(0)
}

console.log(`[run-backend] Starting Go backend from ${backendDir} (go run ./cmd/api)...`)

// No shell:true -- unlike npm/npx (.cmd shims on Windows), `go` is a real executable Node can
// spawn directly via PATH, and shell:true + an args array trips Node's DEP0190 warning (args
// aren't escaped when concatenated into a shell command).
const child = spawn('go', ['run', './cmd/api'], {
  cwd: backendDir,
  stdio: 'inherit',
})

child.on('error', (err) => {
  console.error(`[run-backend] Failed to launch: ${err.message}`)
  process.exit(1)
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
