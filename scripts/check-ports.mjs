#!/usr/bin/env node
// Pre-flight check for dev:all: confirms the ports the root app and admin app dev servers need
// are actually free before concurrently launches them.
//
// Without this, a stale process left on 5173 makes Vite crash mid-startup — after concurrently
// has already launched ADMIN (sitting in wait-on) — producing a stack trace plus a messy partial
// teardown instead of one clear message. This catches it up front.
//
// --free: instead of just reporting, finds and kills whatever process is holding each busy port.
// Off by default — killing an arbitrary process isn't something this script does silently; opt in
// via `npm run free-dev-ports` (or `node scripts/check-ports.mjs --free` directly).

import net from 'node:net'
import { spawnSync } from 'node:child_process'

const PORTS = [
  { port: 5173, label: 'root app (vite)' },
  { port: 4100, label: 'admin app (vite)' },
  { port: 3000, label: 'backend (Go)' },
]

const shouldFree = process.argv.includes('--free')

function checkHost(port, host) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host, timeout: 300 })
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

// Checks both loopback families — a stale server bound only to ::1 (IPv6), which is what Vite's
// dev server does on Windows, would otherwise look "free" to a v4-only check and still crash
// Vite's own bind a moment later.
async function isPortBusy(port) {
  const [v4, v6] = await Promise.all([checkHost(port, '127.0.0.1'), checkHost(port, '::1')])
  return v4 || v6
}

function findWindowsPid(port) {
  const res = spawnSync('netstat', ['-ano'], { encoding: 'utf8' })
  const line = (res.stdout ?? '').split('\n').find((l) => l.includes(`:${port}`) && l.includes('LISTENING'))
  if (!line) return null
  const parts = line.trim().split(/\s+/)
  return parts[parts.length - 1] || null
}

function findPosixPid(port) {
  const res = spawnSync('lsof', ['-ti', `tcp:${port}`], { encoding: 'utf8' })
  const pid = (res.stdout ?? '').trim().split('\n')[0]
  return pid || null
}

function findPid(port) {
  return process.platform === 'win32' ? findWindowsPid(port) : findPosixPid(port)
}

function killPid(pid) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', pid, '/F'], { stdio: 'inherit' })
  } else {
    spawnSync('kill', ['-9', pid], { stdio: 'inherit' })
  }
}

async function main() {
  let unresolved = 0

  for (const { port, label } of PORTS) {
    let busy = await isPortBusy(port)
    let pid = busy ? findPid(port) : null

    if (busy && shouldFree) {
      console.log(`[check-ports] ${port} (${label}) is busy${pid ? ` (pid ${pid})` : ''} — killing it (--free)...`)
      if (pid) killPid(pid)
      busy = await isPortBusy(port)
      if (busy) pid = findPid(port)
    }

    if (busy) {
      unresolved++
      console.error(`\n[check-ports] ERROR: port ${port} (${label}) is already in use${pid ? ` (pid ${pid})` : ''}.`)
      console.error('[check-ports] This is usually a dev server left running from a previous session.')
      if (pid) {
        console.error(
          process.platform === 'win32' ? `[check-ports]   Fix: taskkill /PID ${pid} /F` : `[check-ports]   Fix: kill -9 ${pid}`
        )
      }
      console.error('[check-ports]   Or run: npm run free-dev-ports\n')
    } else {
      console.log(`[check-ports] ${port} (${label}) is free.`)
    }
  }

  if (unresolved > 0) process.exit(1)
}

main()
