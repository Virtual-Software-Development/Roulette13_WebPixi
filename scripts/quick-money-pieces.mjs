#!/usr/bin/env node
// Copia las piezas del video de Quick Money (las que genera QuickMoney_Video_Generator con
// prep_player.py, en su web/player/) a local-media/QuickMoney/, de donde las reproduce
// QuickMoneyPiecesView (el video del sorteo de Quick Money del lobby). Después verifica que estén TODAS
// las que puede pedir un sorteo: si falta una, ese sorteo mostraría el panel de video no disponible.
//
// Solo copia lo nuevo o lo que cambió (por tamaño), así que correrlo de nuevo es rápido. Nunca borra
// nada en el destino.
//
// Uso:
//   npm run quick-money-pieces -- [opciones]
//   node scripts/quick-money-pieces.mjs [opciones]
//
// Opciones:
//   --from <dir>   Piezas generadas (def ../QuickMoney_Video_Generator/web/player)
//   --to <dir>     Destino (def $MEDIA_ROOT/QuickMoney, o ./local-media/QuickMoney)
//   --check        Solo verifica el destino, sin copiar
//   --dry-run      Muestra qué copiaría, sin copiar

import fs from 'node:fs'
import path from 'node:path'

function parseArgs(argv) {
  const opts = { check: false, dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--from') opts.from = argv[++i]
    else if (a === '--to') opts.to = argv[++i]
    else if (a === '--check') opts.check = true
    else if (a === '--dry-run') opts.dryRun = true
    else {
      console.error(`opción desconocida: ${a}`)
      process.exit(2)
    }
  }
  return opts
}

// Intermedios de prep_player.py que el reproductor no usa.
const SKIP = new Set(['trans/_base.mp4'])

function* walk(dir, base = dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full, base)
    else yield path.relative(base, full).split(path.sep).join('/')
  }
}

// Todas las piezas que algún sorteo puede pedir, según player.json (mismo criterio que
// src/video/quickMoneyPieces/plan.ts).
function expectedPieces(manifest) {
  const files = ['player.json', ...manifest.intro.map((c) => c.src), manifest.outro.src]
  for (const pick of ['3', '4']) {
    const j = manifest.jaulas[pick]
    files.push(j.plate)
    for (const pos of Object.keys(j.pos)) {
      for (let d = 1; d <= 9; d++) files.push(`tiles/c${pick}_${pos}_${d}.mp4`)
    }
  }
  for (let n = 0; n < 1000; n++) files.push(manifest.transicion.patron.replace('{p3}', String(n).padStart(3, '0')))
  if (manifest.resultado) {
    files.push(...manifest.resultado.bolas, ...Object.values(manifest.resultado.etiquetas))
  }
  return files
}

function verify(dir) {
  const manifestPath = path.join(dir, 'player.json')
  if (!fs.existsSync(manifestPath)) {
    console.error(`No está ${manifestPath}`)
    return false
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  if (!manifest.resultado) {
    console.error('player.json no trae "resultado" (posiciones de bolas y placas): es de un prep_player.py viejo, volvé a correrlo.')
    return false
  }
  const missing = expectedPieces(manifest).filter((f) => !fs.existsSync(path.join(dir, f)))
  const trans = missing.filter((f) => f.startsWith('trans/'))
  const others = missing.filter((f) => !f.startsWith('trans/'))
  if (others.length) {
    console.error(`Faltan ${others.length} piezas imprescindibles:\n  ${others.slice(0, 20).join('\n  ')}`)
  }
  if (trans.length) {
    // Sin su transición el sorteo igual se ve (se saltea), solo que pasa directo de 3 a 4 jaulas.
    console.warn(`Faltan ${trans.length} de 1000 transiciones (esos sorteos pasan directo de 3 a 4 jaulas).`)
  }
  if (!missing.length) console.log('Están todas las piezas.')
  return others.length === 0
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  const root = process.cwd()
  const from = path.resolve(root, opts.from ?? '../QuickMoney_Video_Generator/web/player')
  const to = path.resolve(root, opts.to ?? path.join(process.env.MEDIA_ROOT ?? './local-media', 'QuickMoney'))

  if (!opts.check) {
    if (!fs.existsSync(path.join(from, 'player.json'))) {
      console.error(`No encuentro ${path.join(from, 'player.json')}.\n` +
        'Generá las piezas en QuickMoney_Video_Generator:\n' +
        '  python prep_render.py --assets web/assets\n' +
        '  python prep_player.py --assets web/assets\n' +
        'o pasá la carpeta con --from.')
      process.exit(1)
    }
    let copied = 0
    let bytes = 0
    let same = 0
    for (const rel of walk(from)) {
      if (SKIP.has(rel)) continue
      const src = path.join(from, rel)
      const dst = path.join(to, rel)
      const size = fs.statSync(src).size
      if (fs.existsSync(dst) && fs.statSync(dst).size === size) {
        same++
        continue
      }
      copied++
      bytes += size
      if (opts.dryRun) {
        console.log(`copiaría ${rel}`)
        continue
      }
      fs.mkdirSync(path.dirname(dst), { recursive: true })
      fs.copyFileSync(src, dst)
      if (copied % 100 === 0) console.log(`  ${copied} copiados...`)
    }
    console.log(`${opts.dryRun ? 'Copiaría' : 'Copiados'} ${copied} archivos (${(bytes / 1e6).toFixed(0)} MB), ` +
      `${same} ya estaban -> ${to}`)
    if (opts.dryRun) return
  }

  if (!verify(to)) process.exit(1)
}

main()
