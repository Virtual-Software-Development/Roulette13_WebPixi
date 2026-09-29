#!/usr/bin/env node
// First step of `npm run dev:all` (predev:all): installs npm dependencies for the root app and
// admin/ when they're missing or older than their package-lock.json -- e.g. right after a clone,
// a pull, or switching to a branch that added a package. Without this, dev:all fails with
// "'concurrently' is not recognized" or a Vite import error instead of just working.

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { ADMIN_DIR, REPO_ROOT } from './lib/devEnv.mjs'

function mtime(file) {
  try {
    return fs.statSync(file).mtimeMs
  } catch {
    return 0
  }
}

function ensure(dir, label) {
  // npm rewrites node_modules/.package-lock.json on every successful install.
  const installed = mtime(path.join(dir, 'node_modules', '.package-lock.json'))
  const wanted = Math.max(mtime(path.join(dir, 'package-lock.json')), mtime(path.join(dir, 'package.json')))
  if (installed && installed >= wanted) return

  console.log(`[ensure-deps] ${label}: dependencies ${installed ? 'out of date' : 'not installed'}, running npm install...`)
  // Single command string (not an args array) with shell:true -- npm is a .cmd shim on Windows.
  const result = spawnSync('npm install', { cwd: dir, stdio: 'inherit', shell: true })
  if (result.status !== 0) {
    console.error(`[ensure-deps] npm install failed in ${dir}.`)
    process.exit(1)
  }
}

ensure(REPO_ROOT, 'root app')
ensure(ADMIN_DIR, 'admin app')
