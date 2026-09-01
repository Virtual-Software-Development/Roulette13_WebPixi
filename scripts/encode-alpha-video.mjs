#!/usr/bin/env node
// Encodes a chroma-keyed (green/blue/black background) .mp4 into a real-alpha .webm
// (VP9 + yuva420p + alpha_mode=1), the same "pre-rendered alpha transparency" format
// Chromium plays natively in a plain <video> — no runtime chroma-key filter needed.
//
// Full docs (options, troubleshooting): scripts/encode-alpha-video.md
//
// Usage:
//   node scripts/encode-alpha-video.mjs [options] [source] [destination]
//
// source / destination default to the lobby loop this was built for:
//   source:      local-media/Lobby/lobby_loop.mp4
//   destination: local-media/Lobby/lobby_loop.webm
//
// source can be a single video file OR a folder (every .mp4/.mov inside it is encoded).
// destination can be an exact output file (single-source mode) or a folder (created if
// missing) that receives one <name>.webm per source file.
//
// Options:
//   --key-color <hex>       Chroma key color, e.g. 0x000cd9 (default: auto-detected by
//                            sampling the top-left corner pixel of each source video)
//   --despill <blue|green|none>  Spill-suppression channel (default: inferred from the
//                            key color; "none" for dark/black keys that don't need it)
//   --similarity <0-1>      colorkey similarity (default 0.16)
//   --blend <0-1>           colorkey blend / edge softness (default 0.12)
//   --fps <n>               Force output fps (default: source fps, auto-detected — this
//                            is what preserves 60fps sources instead of silently dropping
//                            to a lower default)
//   --crf <n>               VP9 quality, lower = better/bigger (default 32)
//   --ext <.mp4,.mov>       Extensions to pick up in folder mode (default ".mp4,.mov")
//   --ffmpeg <path>         ffmpeg binary (default: auto-detected)
//   --ffprobe <path>        ffprobe binary (default: auto-detected)
//   --dry-run               Print the plan without encoding anything
//
// Examples:
//   node scripts/encode-alpha-video.mjs
//   node scripts/encode-alpha-video.mjs local-media/Videos/9/9_2.mp4
//   node scripts/encode-alpha-video.mjs local-media/RawRenders local-media/Videos/12
//   node scripts/encode-alpha-video.mjs --key-color 0x00ff00 --despill green intro.mp4

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')

const DEFAULT_SOURCE = path.join(REPO_ROOT, 'local-media/Lobby/lobby_loop.mp4')
const DEFAULT_DEST = path.join(REPO_ROOT, 'local-media/Lobby/lobby_loop.webm')

function parseArgs(argv) {
  const opts = {
    keyColor: null,
    despill: null,
    similarity: 0.16,
    blend: 0.12,
    fps: null,
    crf: 32,
    ext: ['.mp4', '.mov'],
    ffmpeg: null,
    ffprobe: null,
    dryRun: false,
  }
  const positional = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = () => argv[++i]
    switch (arg) {
      case '--key-color': opts.keyColor = next(); break
      case '--despill': opts.despill = next(); break
      case '--similarity': opts.similarity = Number(next()); break
      case '--blend': opts.blend = Number(next()); break
      case '--fps': opts.fps = Number(next()); break
      case '--crf': opts.crf = Number(next()); break
      case '--ext': opts.ext = next().split(',').map((e) => e.trim().toLowerCase()); break
      case '--ffmpeg': opts.ffmpeg = next(); break
      case '--ffprobe': opts.ffprobe = next(); break
      case '--dry-run': opts.dryRun = true; break
      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
        break
      default:
        positional.push(arg)
    }
  }

  opts.source = positional[0] ? path.resolve(positional[0]) : DEFAULT_SOURCE
  opts.destination = positional[1] ? path.resolve(positional[1]) : DEFAULT_DEST
  return opts
}

function printHelp() {
  const header = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n')
    .filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n')
  console.log(header)
}

function resolveBinary(explicit, name) {
  if (explicit) return explicit
  const onPath = spawnSync(process.platform === 'win32' ? `${name}.exe` : name, ['-version'], { stdio: 'ignore' })
  if (!onPath.error && onPath.status === 0) return name

  // Fall back to the winget default install location on Windows.
  if (process.platform === 'win32') {
    const wingetRoot = path.join(
      process.env.LOCALAPPDATA ?? '',
      'Microsoft/WinGet/Packages',
    )
    if (fs.existsSync(wingetRoot)) {
      const pkgDir = fs.readdirSync(wingetRoot).find((d) => d.startsWith('Gyan.FFmpeg_'))
      if (pkgDir) {
        const buildDir = fs.readdirSync(path.join(wingetRoot, pkgDir)).find((d) => d.startsWith('ffmpeg-'))
        if (buildDir) {
          const candidate = path.join(wingetRoot, pkgDir, buildDir, 'bin', `${name}.exe`)
          if (fs.existsSync(candidate)) return candidate
        }
      }
    }
  }

  throw new Error(`Could not find "${name}" on PATH. Pass --${name} <path> explicitly.`)
}

function run(bin, args) {
  const result = spawnSync(bin, args, { encoding: 'utf8' })
  if (result.error) throw result.error
  return result
}

function probe(ffprobe, file, entries) {
  const result = run(ffprobe, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', `stream=${entries.join(',')}`,
    '-of', 'default=noprint_wrappers=1:nokey=0',
    file,
  ])
  if (result.status !== 0) throw new Error(`ffprobe failed on ${file}: ${result.stderr}`)
  const out = {}
  for (const line of result.stdout.trim().split('\n')) {
    const [key, value] = line.split('=')
    out[key] = value
  }
  return out
}

function detectFps(ffprobe, file) {
  const { r_frame_rate: rate } = probe(ffprobe, file, ['r_frame_rate'])
  const [num, den] = rate.split('/').map(Number)
  return den ? num / den : num
}

// Samples the top-left corner pixel (a safe bet for chroma-keyed renders, which frame the
// subject centered with a clean background border) to auto-detect the key color instead
// of requiring the caller to know it up front.
function detectKeyColor(ffmpeg, file) {
  // A 1x1 crop trips an encoder-init edge case on some ffmpeg builds, so crop a small
  // even block instead and just read its first pixel.
  const result = spawnSync(ffmpeg, [
    '-y', '-ss', '1', '-i', file,
    '-frames:v', '1',
    '-vf', 'crop=4:4:5:5',
    '-f', 'rawvideo', '-pix_fmt', 'rgb24',
    'pipe:1',
  ], { encoding: 'buffer' })
  if (result.status !== 0 || !result.stdout || result.stdout.length < 3) {
    throw new Error(`Could not sample a corner pixel from ${file} to auto-detect the key color.`)
  }
  const [r, g, b] = result.stdout
  return { r, g, b, hex: '0x' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('') }
}

function inferDespill({ r, g, b }, explicit) {
  if (explicit) return explicit === 'none' ? null : explicit
  const max = Math.max(r, g, b)
  if (max < 40) return null // dark/black key: no colored spill to suppress
  if (b >= g && b >= r) return 'blue'
  if (g >= b && g >= r) return 'green'
  return null // red-keyed footage isn't a supported despill channel
}

function buildFilterChain({ keyColorHex, similarity, blend, despillType }) {
  const stages = [`colorkey=${keyColorHex}:${similarity}:${blend}`]
  if (despillType) {
    const channel = despillType === 'blue' ? 'blue=-1:green=0:red=0' : 'green=-1:blue=0:red=0'
    stages.push(`despill=type=${despillType}:${channel}:mix=0.5:expand=0.2`)
  }
  stages.push('format=yuva420p')
  return stages.join(',')
}

function encodeOne(ffmpeg, ffprobe, src, dest, opts) {
  const keyColor = opts.keyColor ? { hex: opts.keyColor } : detectKeyColor(ffmpeg, src)
  const despillType = inferDespill(
    opts.keyColor ? hexToRgb(opts.keyColor) : keyColor,
    opts.despill,
  )
  const fps = opts.fps ?? detectFps(ffprobe, src)
  const vf = buildFilterChain({
    keyColorHex: keyColor.hex,
    similarity: opts.similarity,
    blend: opts.blend,
    despillType,
  })

  console.log(`\n${path.relative(REPO_ROOT, src)} -> ${path.relative(REPO_ROOT, dest)}`)
  console.log(`  key color: ${keyColor.hex}  despill: ${despillType ?? 'none'}  fps: ${fps}  crf: ${opts.crf}`)

  if (opts.dryRun) return

  fs.mkdirSync(path.dirname(dest), { recursive: true })
  const args = [
    '-y', '-i', src,
    '-vf', vf,
    '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p',
    '-b:v', '0', '-crf', String(opts.crf), '-auto-alt-ref', '0',
    '-r', String(fps),
    '-metadata:s:v:0', 'alpha_mode=1',
    '-an',
    dest,
  ]
  const result = run(ffmpeg, args)
  if (result.status !== 0) throw new Error(`ffmpeg failed on ${src}:\n${result.stderr}`)
  console.log(`  done (${(fs.statSync(dest).size / 1024 / 1024).toFixed(1)} MB)`)
}

function hexToRgb(hex) {
  const clean = hex.replace(/^0x/, '')
  const num = parseInt(clean, 16)
  return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff }
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  const ffmpeg = resolveBinary(opts.ffmpeg, 'ffmpeg')
  const ffprobe = resolveBinary(opts.ffprobe, 'ffprobe')

  const sourceStat = fs.statSync(opts.source)

  if (sourceStat.isDirectory()) {
    const files = fs.readdirSync(opts.source)
      .filter((name) => opts.ext.includes(path.extname(name).toLowerCase()))
      .map((name) => path.join(opts.source, name))

    if (files.length === 0) {
      console.error(`No files with extensions [${opts.ext.join(', ')}] found in ${opts.source}`)
      process.exit(1)
    }

    const destIsExplicitFile = !fs.existsSync(opts.destination) && path.extname(opts.destination) !== ''
    const destDir = destIsExplicitFile ? path.dirname(opts.destination) : opts.destination

    for (const file of files) {
      const dest = path.join(destDir, `${path.basename(file, path.extname(file))}.webm`)
      encodeOne(ffmpeg, ffprobe, file, dest, opts)
    }
  } else {
    const destIsDir = fs.existsSync(opts.destination) && fs.statSync(opts.destination).isDirectory()
    const dest = destIsDir
      ? path.join(opts.destination, `${path.basename(opts.source, path.extname(opts.source))}.webm`)
      : opts.destination
    encodeOne(ffmpeg, ffprobe, opts.source, dest, opts)
  }
}

main()
