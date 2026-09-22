#!/usr/bin/env node
// Reports how many valid roulette result-video variants exist in local-media/Videos, versus
// how many are required (38 results x --required variants each, default 5 = 190).
//
// Pure filesystem scan — the folder is the only source of truth (see scripts/lib/
// rouletteVideoLibrary.mjs for why). Safe to run any time, including while intake is running
// elsewhere; it never writes anything.
//
// Usage:
//   node scripts/roulette-video-status.mjs [options]
//   npm run roulette-video-status -- [options]
//
// Options:
//   --required <n>   Required variants per result (default 5)
//   --json            Print machine-readable JSON instead of the human report
//   --verify          Also validate each candidate clip with ffprobe (opens the container,
//                      confirms it has a decodable video stream) instead of only the fast
//                      size check. Slower — needs ffprobe on PATH or --ffprobe <path>.
//   --ffprobe <path>  ffprobe binary to use with --verify (default: auto-detected via PATH)
//   --fail-if-incomplete  Exit with status 1 if the library isn't at 190/190 yet (useful in CI)
//
// Examples:
//   node scripts/roulette-video-status.mjs
//   node scripts/roulette-video-status.mjs --required 3
//   node scripts/roulette-video-status.mjs --verify --json

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  VIDEOS_DIR,
  DEFAULT_REQUIRED_VARIANTS,
  scanLibrary,
  computeInventory,
  formatStatusReport,
} from './lib/rouletteVideoLibrary.mjs'

function parseArgs(argv) {
  const opts = { required: DEFAULT_REQUIRED_VARIANTS, json: false, verify: false, ffprobe: null, failIfIncomplete: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = () => argv[++i]
    switch (arg) {
      case '--required': opts.required = Number(next()); break
      case '--json': opts.json = true; break
      case '--verify': opts.verify = true; break
      case '--ffprobe': opts.ffprobe = next(); break
      case '--fail-if-incomplete': opts.failIfIncomplete = true; break
      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
        break
      default:
        console.error(`Unknown argument: ${arg}`)
        process.exit(1)
    }
  }
  return opts
}

function printHelp() {
  const header = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n')
    .filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n')
  console.log(header)
}

// Confirms ffprobe can actually open the file and finds a video stream — catches a file that
// passed the size check but is still corrupt (e.g. truncated mid-write in a way that leaves it
// larger than MIN_VALID_SIZE_BYTES). Only runs with --verify since it's much slower than a
// stat() call.
function verifyWithFfprobe(ffprobe, file) {
  const result = spawnSync(ffprobe, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=codec_type',
    '-of', 'csv=p=0',
    file.path,
  ], { encoding: 'utf8' })
  return result.status === 0 && result.stdout.trim() === 'video'
}

function main() {
  const opts = parseArgs(process.argv.slice(2))

  let extraValidate
  if (opts.verify) {
    const ffprobe = opts.ffprobe ?? 'ffprobe'
    const check = spawnSync(ffprobe, ['-version'], { stdio: 'ignore' })
    if (check.error || check.status !== 0) {
      console.error(`Could not find "${ffprobe}" for --verify. Pass --ffprobe <path> or omit --verify.`)
      process.exit(1)
    }
    extraValidate = (file) => verifyWithFfprobe(ffprobe, file)
  }

  const scan = scanLibrary(VIDEOS_DIR, extraValidate)
  const inventory = computeInventory(scan, opts.required)

  if (opts.json) {
    console.log(JSON.stringify(inventory, null, 2))
  } else {
    console.log(formatStatusReport(inventory))

    // Surface rejected files separately — they matter for debugging even though they don't
    // count toward the inventory.
    for (const [, { rejected }] of scan) {
      for (const file of rejected) {
        console.log(`\n[rejected] ${path.relative(VIDEOS_DIR, file.path)}: ${file.reason}`)
      }
    }
  }

  if (opts.failIfIncomplete && !inventory.isComplete) {
    process.exit(1)
  }
}

main()
