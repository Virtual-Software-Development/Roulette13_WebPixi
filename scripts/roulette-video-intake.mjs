#!/usr/bin/env node
// Takes newly-added raw chroma-keyed clips out of a staging folder, encodes each one with the
// existing scripts/encode-alpha-video.mjs (unmodified — this script only orchestrates it), and
// places the result into local-media/Videos/<result>/ under the project's naming convention
// ("roulette_<result>_var<LETTER>.webm", e.g. "roulette_17_varA.webm"), without ever overwriting
// an existing variant.
//
// This is the "keep only what's still missing" half of the video library: it never touches
// results that already have their required variant count, and within an incomplete result it
// only consumes as many raw clips as are actually still needed — extra raw files are left alone
// in staging, never deleted.
//
// Staging layout (mirrors the destination layout, and the folder-mode example already
// documented in encode-alpha-video.md):
//   local-media/RawRenders/<result>/*.mp4   (or .mov, or --ext)
// e.g. local-media/RawRenders/17/take3.mp4, local-media/RawRenders/00/spin_014.mov
//
// After a raw file is successfully encoded and placed, it's moved to
// local-media/RawRenders/<result>/_encoded/ rather than deleted — the raw footage is never
// destroyed, so nothing is lost if you ever want to re-encode with different settings.
//
// If a file fails to encode (or produces a too-small/corrupt output), it's left exactly where
// it was in staging — the failure is logged, the batch continues with the next file, and the
// same run (or the next one) will simply try it again. There is no separate crash/retry
// bookkeeping to go stale: the presence of the raw file in staging (not in _encoded/) IS the
// "needs retry" state.
//
// Usage:
//   node scripts/roulette-video-intake.mjs [options]
//   npm run roulette-video-intake -- [options]
//
// Options:
//   --staging <dir>   Staging root (default: local-media/RawRenders)
//   --required <n>    Required variants per result (default 5)
//   --result <id>     Only process this one result (e.g. "17" or "00") — targeted generation.
//                      Without this, every incomplete result's staging folder is processed.
//   --ext <.mp4,.mov> Extensions to pick up per result folder (default ".mp4,.mov")
//   --dry-run         Print what would be encoded/placed without touching any file
//   --key-color / --despill / --similarity / --blend / --fps / --crf / --ffmpeg / --ffprobe
//                     Forwarded as-is to encode-alpha-video.mjs for every file — see
//                     encode-alpha-video.md for what each one does.
//
// Examples:
//   node scripts/roulette-video-intake.mjs
//   node scripts/roulette-video-intake.mjs --result 26
//   node scripts/roulette-video-intake.mjs --dry-run
//   node scripts/roulette-video-intake.mjs --key-color 0x000000 --despill none

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  REPO_ROOT,
  VIDEOS_DIR,
  DEFAULT_REQUIRED_VARIANTS,
  ALL_RESULTS,
  scanLibrary,
  computeInventory,
  formatStatusReport,
  nextFreeVariantIndex,
  destinationPath,
  tempFileName,
} from './lib/rouletteVideoLibrary.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENCODE_SCRIPT = path.join(__dirname, 'encode-alpha-video.mjs')
const DEFAULT_STAGING = path.join(REPO_ROOT, 'local-media/RawRenders')

function parseArgs(argv) {
  const opts = {
    staging: DEFAULT_STAGING,
    required: DEFAULT_REQUIRED_VARIANTS,
    onlyResult: null,
    ext: ['.mp4', '.mov'],
    dryRun: false,
    // Encode passthrough — forwarded verbatim to encode-alpha-video.mjs when present.
    encodePassthrough: [],
  }
  const passthroughFlags = new Set(['--key-color', '--despill', '--similarity', '--blend', '--fps', '--crf', '--ffmpeg', '--ffprobe'])

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = () => argv[++i]
    switch (arg) {
      case '--staging': opts.staging = path.resolve(next()); break
      case '--required': opts.required = Number(next()); break
      case '--result': opts.onlyResult = next(); break
      case '--ext': opts.ext = next().split(',').map((e) => e.trim().toLowerCase()); break
      case '--dry-run': opts.dryRun = true; break
      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
        break
      default:
        if (passthroughFlags.has(arg)) {
          opts.encodePassthrough.push(arg, next())
        } else {
          console.error(`Unknown argument: ${arg}`)
          process.exit(1)
        }
    }
  }
  return opts
}

function printHelp() {
  const header = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n')
    .filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n')
  console.log(header)
}

function rawFilesFor(result, opts) {
  const dir = path.join(opts.staging, result)
  let entries = []
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
  return entries
    .filter((e) => e.isFile() && opts.ext.includes(path.extname(e.name).toLowerCase()))
    .map((e) => path.join(dir, e.name))
    .sort() // deterministic order run to run
}

function encodedMarkerDir(rawFilePath) {
  return path.join(path.dirname(rawFilePath), '_encoded')
}

// Encodes one raw clip to a temp filename first, validates it, and only then renames it into
// its final "roulette_<result>_var<LETTER>.webm" slot. If anything goes wrong, the temp file is cleaned up and
// the raw source is left untouched in staging for the next run to retry — never partially
// registers a clip.
function encodeOneClip(rawFile, result, index, opts) {
  const finalDest = destinationPath(result, index, VIDEOS_DIR) // throws on unexpected collision
  const tempDest = path.join(VIDEOS_DIR, result, tempFileName(result, index))

  console.log(`\n${result}: encoding ${path.relative(REPO_ROOT, rawFile)} -> ${path.relative(REPO_ROOT, finalDest)}`)

  if (opts.dryRun) {
    console.log('  (dry run, skipped)')
    return true
  }

  const args = [ENCODE_SCRIPT, rawFile, tempDest, ...opts.encodePassthrough]
  const result_ = spawnSync(process.execPath, args, { stdio: 'inherit' })

  if (result_.status !== 0) {
    console.error(`  ERROR: encode failed for ${rawFile} (exit ${result_.status}). Clip NOT registered; raw file left in staging for retry.`)
    if (fs.existsSync(tempDest)) fs.rmSync(tempDest)
    return false
  }

  let size = 0
  try {
    size = fs.statSync(tempDest).size
  } catch {
    console.error(`  ERROR: encoder reported success but produced no output file for ${rawFile}. Clip NOT registered.`)
    return false
  }
  if (size < 10 * 1024) {
    console.error(`  ERROR: encoded output is suspiciously small (${size} bytes) — treating as invalid. Clip NOT registered.`)
    fs.rmSync(tempDest)
    return false
  }

  // Final existence check right before the rename — closes the (very unlikely) window between
  // destinationPath()'s check above and now. Still never overwrites.
  if (fs.existsSync(finalDest)) {
    console.error(`  ERROR: destination appeared unexpectedly (${finalDest}) — refusing to overwrite. Leaving temp file at ${tempDest} for inspection.`)
    return false
  }
  fs.renameSync(tempDest, finalDest)

  const encodedDir = encodedMarkerDir(rawFile)
  fs.mkdirSync(encodedDir, { recursive: true })
  fs.renameSync(rawFile, path.join(encodedDir, path.basename(rawFile)))

  console.log(`  saved: ${path.relative(REPO_ROOT, finalDest)}`)
  return true
}

function main() {
  const opts = parseArgs(process.argv.slice(2))

  const encodeCheck = spawnSync(process.execPath, [ENCODE_SCRIPT, '--help'], { stdio: 'ignore' })
  if (encodeCheck.error) {
    console.error(`Could not invoke encode-alpha-video.mjs: ${encodeCheck.error.message}`)
    process.exit(1)
  }

  const scan = scanLibrary(VIDEOS_DIR)
  const inventory = computeInventory(scan, opts.required)

  // Includes already-complete results too (not just incomplete ones): the loop below skips
  // encoding for those, but still reports if staging has leftover raw files for them, so a
  // clip that's just sitting unused isn't silently invisible.
  const targets = opts.onlyResult
    ? inventory.perResult.filter((r) => r.result === opts.onlyResult)
    : inventory.perResult

  if (opts.onlyResult && targets.length === 0) {
    console.error(`"${opts.onlyResult}" is not a valid result (expected one of: ${ALL_RESULTS.join(', ')})`)
    process.exit(1)
  }

  console.log('========================================')
  console.log('ROULETTE VIDEO LIBRARY INTAKE')
  console.log('========================================')

  let processedCount = 0

  for (const target of targets) {
    if (target.complete) {
      const raw = rawFilesFor(target.result, opts)
      if (raw.length > 0) {
        console.log(`\n${target.result}: already complete (${target.existing}/${target.required}) — leaving ${raw.length} raw file(s) untouched in staging.`)
      }
      continue
    }

    const rawFiles = rawFilesFor(target.result, opts)
    if (rawFiles.length === 0) continue

    let remaining = target.remaining
    // Tracked locally instead of re-querying the filesystem per file: in --dry-run nothing is
    // ever actually written, so a fresh nextFreeVariantIndex() call would return the same index
    // for every file in the batch. Real runs could also re-scan each time (nothing else writes
    // to this folder concurrently), but a local counter keeps dry-run and real behavior
    // identical, which is the point of having a dry-run mode at all.
    let nextIndex = nextFreeVariantIndex(target.result, VIDEOS_DIR)
    console.log(`\n${target.result}: ${target.existing}/${target.required} existing, needs ${remaining} more, ${rawFiles.length} raw clip(s) available`)

    for (const rawFile of rawFiles) {
      if (remaining <= 0) {
        console.log(`  ${target.result} is now fully covered — leaving remaining raw file(s) untouched in staging.`)
        break
      }
      const ok = encodeOneClip(rawFile, target.result, nextIndex, opts)
      if (ok) {
        nextIndex++
        remaining--
        if (!opts.dryRun) processedCount++
      }
    }
  }

  console.log('\n========================================')
  const finalScan = opts.dryRun ? scan : scanLibrary(VIDEOS_DIR)
  const finalInventory = opts.dryRun ? inventory : computeInventory(finalScan, opts.required)
  console.log(formatStatusReport(finalInventory))
  if (finalInventory.isComplete) {
    console.log('\nAll 190 required clips are present — nothing left to encode.')
  }
  console.log(`\n${processedCount} clip(s) ${opts.dryRun ? 'would be ' : ''}registered this run.`)
  console.log('========================================')
}

main()
