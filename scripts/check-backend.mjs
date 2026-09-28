#!/usr/bin/env node
// Pings API_URL before dev:all starts the dev servers, so a missing/unreachable backend shows up
// as one clear warning up front instead of a wall of silent 502s the first time the browser makes
// an API call. Informational only — never blocks or fails the run, since the backend lives
// outside this repo and isn't something this script can start.

import http from 'node:http'
import https from 'node:https'

try {
  process.loadEnvFile('.env')
} catch {
  // .env is optional -- fall back to whatever is already in process.env
}

const target = process.env.API_URL ?? 'http://localhost:3000'
const url = new URL(target)
const client = url.protocol === 'https:' ? https : http

const req = client.request(
  {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: '/',
    method: 'GET',
    timeout: 1500,
  },
  (res) => {
    console.log(`[check-backend] Backend reachable at ${target} (status ${res.statusCode}).`)
    res.resume()
  }
)

req.on('timeout', () => {
  req.destroy()
  warn()
})
req.on('error', warn)
req.end()

function warn() {
  console.warn(`\n[check-backend] WARNING: could not reach backend at ${target}.`)
  console.warn('[check-backend] Dev servers will still start, but /api requests will fail (502) until the backend is running.\n')
}
