#!/usr/bin/env node
// Gate for `npm run dev:admin`: waits for the root app (required -- admin's dev proxy forwards
// /api and /media through it) before starting, and ALSO waits a bit for the backend, so opening
// the login page doesn't win a race against `go run` still compiling. Unlike the root app, the
// backend wait is soft -- run-backend.mjs is deliberately non-fatal when no backend checkout is
// found (BACKEND_DIR unset/missing), and tcp:3000 would then never open; this script must not hang
// admin forever in that case, it just proceeds with a console warning.

import waitOn from 'wait-on'

// Bare `tcp:<port>` (no explicit host), not `tcp:127.0.0.1:<port>` -- Vite on Windows binds to
// ::1 (IPv6), not 127.0.0.1 (same gotcha check-ports.mjs already works around); hardcoding the v4
// address here made this wait never resolve even once the port was actually listening.
async function waitForPort(port, { timeout } = {}) {
  await waitOn({ resources: [`tcp:${port}`], timeout })
}

async function main() {
  await waitForPort(5173)

  try {
    await waitForPort(3000, { timeout: 30_000 })
  } catch {
    console.warn('\n[wait-for-admin-deps] Backend on :3000 did not come up within 30s -- starting admin anyway.')
    console.warn('[wait-for-admin-deps] Login and other /api calls will fail until it is reachable.\n')
  }
}

main()
