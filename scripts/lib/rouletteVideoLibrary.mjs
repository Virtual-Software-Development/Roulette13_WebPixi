// Shared core for the roulette video-library tools (roulette-video-status.mjs,
// roulette-video-intake.mjs). Pure filesystem inspection — no ffmpeg/child_process here,
// so `status` can run fast and dependency-light; only `intake` needs the encoder.
//
// Design principle: the filesystem under local-media/Videos/<result>/ is the ONLY source
// of truth. There is no manifest/database tracking progress — on every run we re-scan disk
// from scratch, so "resume after a crash" is free: there is nothing to resume, the next run
// just sees whatever files actually exist.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = path.resolve(__dirname, '../..')
export const VIDEOS_DIR = path.join(REPO_ROOT, 'local-media/Videos')
export const DEFAULT_REQUIRED_VARIANTS = 5

// American roulette, 38 pockets. Kept as strings everywhere in this tool (never coerced to
// number) specifically so "0" and "00" can never collide — they are different folder names,
// nothing more. See ADR-style note in roulette-video-status.mjs's --help output.
export const ALL_RESULTS = [
  '0', '00', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
  '31', '32', '33', '34', '35', '36',
]

// A clip must be at least this large to count as valid — cheap guard against a zero-byte or
// truncated file left behind by a crashed/killed encode. Not a substitute for --verify
// (ffprobe), just a fast default check that always runs.
const MIN_VALID_SIZE_BYTES = 10 * 1024

// Variant index <-> the single-letter suffix used on disk (0 -> A, 1 -> B, ... 25 -> Z).
// Caps out at 26 variants per result, well above DEFAULT_REQUIRED_VARIANTS (5) — plenty of
// headroom for extra takes.
function indexToLetter(index) {
  if (index < 0 || index > 25) throw new Error(`Variant index out of range for a letter suffix: ${index}`)
  return String.fromCharCode(65 + index)
}
function letterToIndex(letter) {
  return letter.toUpperCase().charCodeAt(0) - 65
}

// Matches the on-disk convention (local-media/Videos/12/roulette_12_varA.webm):
// "roulette_<result>_var<LETTER>.webm". Anything else in the folder (a stray file, a .tmp-*
// in-progress encode, a misnamed clip) is ignored by the scanner rather than miscounted — see
// tempFileName below for why in-progress files are named so they can never accidentally match
// this pattern. Case-insensitive on read (a stray lowercase letter still counts), but everything
// this tool *writes* is always uppercase, per the agreed naming convention.
function variantPattern(result) {
  const escaped = result.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^roulette_${escaped}_var([A-Za-z])\\.webm$`, 'i')
}

// In-progress encodes are written under this name and only renamed to the final
// "roulette_<result>_var<LETTER>.webm" after the encoder exits successfully and the size check
// passes (see intake's encodeOneClip). A process killed mid-encode leaves a ".tmp-*" file, which
// variantPattern() above will never match — so a crash can never look like a valid variant,
// without needing any separate crash-recovery bookkeeping.
export function tempFileName(result, index) {
  const rand = Math.random().toString(36).slice(2, 8)
  return `.tmp-roulette_${result}_var${indexToLetter(index)}-${rand}.webm`
}

/**
 * Scans local-media/Videos/<result>/ for every known result and returns, per result, the
 * list of files that match the naming convention and pass the size check.
 *
 * @param {string} videosDir
 * @param {(file: {result: string, path: string, size: number}) => boolean} [extraValidate]
 *   Optional additional check (e.g. ffprobe-based --verify in the status CLI). Files failing
 *   this are excluded from the valid list but still reported so the caller can log why.
 */
export function scanLibrary(videosDir = VIDEOS_DIR, extraValidate) {
  const perResult = new Map()

  for (const result of ALL_RESULTS) {
    const dir = path.join(videosDir, result)
    const valid = []
    const rejected = []

    let entries = []
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      // Folder doesn't exist yet — 0 variants, not an error.
      perResult.set(result, { valid, rejected })
      continue
    }

    const pattern = variantPattern(result)
    for (const entry of entries) {
      if (!entry.isFile()) continue
      const match = pattern.exec(entry.name)
      if (!match) continue // not our naming convention (includes .tmp-* in-progress files)

      const filePath = path.join(dir, entry.name)
      const size = fs.statSync(filePath).size
      const variantIndex = letterToIndex(match[1])
      const file = { result, path: filePath, name: entry.name, variantIndex, size }

      if (size < MIN_VALID_SIZE_BYTES) {
        rejected.push({ ...file, reason: `file too small (${size} bytes) — likely truncated/corrupt` })
        continue
      }
      if (extraValidate && !extraValidate(file)) {
        rejected.push({ ...file, reason: 'failed --verify check' })
        continue
      }
      valid.push(file)
    }

    perResult.set(result, { valid, rejected })
  }

  return perResult
}

/**
 * Turns a scanLibrary() result into the summary numbers the reports/CLI need.
 */
export function computeInventory(scan, requiredVariants = DEFAULT_REQUIRED_VARIANTS) {
  const perResult = ALL_RESULTS.map((result) => {
    const existing = scan.get(result)?.valid.length ?? 0
    const remaining = Math.max(0, requiredVariants - existing)
    return { result, existing, required: requiredVariants, remaining, complete: existing >= requiredVariants }
  })

  const totalExisting = perResult.reduce((sum, r) => sum + r.existing, 0)
  const totalRequired = ALL_RESULTS.length * requiredVariants
  const completedCount = perResult.filter((r) => r.complete).length

  return {
    perResult,
    totalRequired,
    totalExisting: Math.min(totalExisting, totalRequired), // excess clips don't inflate the total
    rawTotalExisting: totalExisting, // uncapped, for reporting "existing / required" per result honestly
    totalRemaining: perResult.reduce((sum, r) => sum + r.remaining, 0),
    completedCount,
    incompleteCount: ALL_RESULTS.length - completedCount,
    isComplete: completedCount === ALL_RESULTS.length,
  }
}

/**
 * Next free variant index for a result: the smallest non-negative integer not already used.
 *
 * Fills gaps (e.g. if 0,1,3 exist, returns 2) rather than always appending after the highest
 * index. Chosen because nothing downstream (the app's fetchVideoFilesForNumber picks randomly
 * among whatever files are in the folder) depends on the specific numeric value of a variant's
 * index — only the folder's file *count* matters for "how many variants exist". Keeping indices
 * dense (0..count-1, no permanent holes) makes the on-disk state easier to eyeball and avoids
 * variant numbers climbing indefinitely if an invalid clip is ever removed by hand.
 */
export function nextFreeVariantIndex(result, videosDir = VIDEOS_DIR) {
  const dir = path.join(videosDir, result)
  let entries = []
  try {
    entries = fs.readdirSync(dir)
  } catch {
    return 0
  }
  const pattern = variantPattern(result)
  const used = new Set()
  for (const name of entries) {
    const match = pattern.exec(name)
    if (match) used.add(Number(match[1]))
  }
  let index = 0
  while (used.has(index)) index++
  return index
}

/**
 * Final destination path for a new variant. Throws if it already exists — that should be
 * unreachable (nextFreeVariantIndex just computed a free one), so a collision here means
 * something else wrote to the folder between the two calls; treat it as an error rather than
 * silently overwriting (requirement: never overwrite a valid clip).
 */
export function destinationPath(result, index, videosDir = VIDEOS_DIR) {
  const dest = path.join(videosDir, result, `roulette_${result}_var${indexToLetter(index)}.webm`)
  if (fs.existsSync(dest)) {
    throw new Error(`Refusing to overwrite existing file: ${dest}`)
  }
  return dest
}

export function formatStatusReport(inventory) {
  const lines = []
  lines.push('VIDEO LIBRARY STATUS')
  lines.push('')
  lines.push(`Valid clips:       ${inventory.rawTotalExisting} / ${inventory.totalRequired}`)
  lines.push(`Completed results: ${inventory.completedCount} / ${ALL_RESULTS.length}`)
  lines.push(`Remaining clips:   ${inventory.totalRemaining}`)

  const missing = inventory.perResult.filter((r) => !r.complete)
  if (missing.length > 0) {
    lines.push('')
    lines.push('Missing:')
    for (const r of missing) {
      lines.push(`${r.result.padEnd(3)} -> ${r.existing}/${r.required} (needs ${r.remaining})`)
    }
  } else {
    lines.push('')
    lines.push('ROULETTE VIDEO LIBRARY COMPLETE — all 38 results have their required variants.')
  }

  return lines.join('\n')
}
