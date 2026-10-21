import type { PiecesImage, PiecesPlan, PiecesSegment, PiecesTile } from './plan'

// Reproduce un PiecesPlan (ver plan.ts) dentro de un contenedor 16:9: una capa por tramo, el que
// suena arriba y los siguientes precargados abajo, ocultos. Un solo reloj (requestAnimationFrame)
// maneja todo leyendo currentTime de cada <video>:
//   - arranca el tramo siguiente un poco antes del final del actual (lo que tarda play() en mostrar
//     movimiento, medido en cada empalme) y saca el actual cuando el siguiente ya se mueve;
//   - arranca cada recorte en su frame y lo mantiene alineado al plate (velocidad, o un salto si se
//     desfasó mucho).
// NO usa requestVideoFrameCallback para decidir nada: Firefox no lo llama en un video tapado por
// otro, y el tramo anterior quedaba congelado encima (probado en el prototipo del generador).

// play() tarda en mostrar movimiento; estimación inicial, se ajusta en cada empalme.
const INITIAL_PLAY_DELAY_MS = 80
// Si el siguiente no arrancó, el anterior se saca igual pasado esto desde su final: mejor un frame
// quieto que el anterior pegado encima.
const MAX_SWAP_WAIT_MS = 400
// Los recortes arrancan este número de frames antes de su entrada.
const TILE_LEAD_FRAMES = 1
// Desfase de un recorte en frames: por debajo de DEADBAND no se toca; hasta JUMP se corrige con la
// velocidad; desde JUMP, con un seek.
const DEADBAND_FRAMES = 0.5
const JUMP_FRAMES = 6
// Cuánto se espera a que cargue un tramo antes de arrancarlo igual.
const LOAD_TIMEOUT_MS = 8_000

export interface PiecesPlayerOptions {
  container: HTMLElement
  plan: PiecesPlan
  onEnded: () => void
  // Una pieza imprescindible no cargó (falta en local-media): el que lo usa muestra el panel de
  // video no disponible. La transición es la única que se puede saltear sin perder el resultado.
  onError: (err: Error) => void
}

interface TileState {
  def: PiecesTile
  video: HTMLVideoElement
  started: boolean
  visible: boolean
  worstDrift: number
  jumps: number
}

function createVideo(src: string, className: string): HTMLVideoElement {
  const v = document.createElement('video')
  v.className = className
  // Kiosco sin interacción: mudo + playsinline (como atributos) para que el autoplay no se bloquee.
  v.muted = true
  v.setAttribute('muted', '')
  v.playsInline = true
  v.setAttribute('playsinline', '')
  v.preload = 'auto'
  v.disableRemotePlayback = true
  v.src = src
  return v
}

// true si cargó; false si dio error. Con timeout resuelve true igual (que intente reproducir).
function waitForData(v: HTMLVideoElement): Promise<boolean> {
  return new Promise((resolve) => {
    if (v.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return resolve(true)
    const done = (ok: boolean) => {
      clearTimeout(timer)
      v.removeEventListener('canplaythrough', onOk)
      v.removeEventListener('canplay', onOk)
      v.removeEventListener('error', onError)
      resolve(ok)
    }
    const onOk = () => done(true)
    const onError = () => done(false)
    v.addEventListener('canplaythrough', onOk)
    v.addEventListener('canplay', onOk)
    v.addEventListener('error', onError)
    const timer = setTimeout(() => done(true), LOAD_TIMEOUT_MS)
  })
}

class Segment {
  readonly def: PiecesSegment
  readonly el: HTMLDivElement
  readonly main: HTMLVideoElement
  readonly tiles: TileState[]
  readonly loaded: Promise<boolean>
  frame = 0
  started = false
  // currentTime ya avanzó desde el play(): se está viendo moverse.
  moving = false
  destroyed = false
  endSeenAt: number | null = null
  private startTime = 0
  private playAt = 0
  private readonly fps: number

  constructor(def: PiecesSegment, plan: PiecesPlan, zIndex: number, parent: HTMLElement) {
    this.def = def
    this.fps = plan.fps
    const pct = (v: number, total: number) => `${(v / total) * 100}%`

    this.el = document.createElement('div')
    this.el.className = 'qm-pieces-segment qm-pieces-segment--waiting'
    this.el.style.zIndex = String(zIndex)

    this.main = createVideo(def.src, 'qm-pieces-main')
    this.el.append(this.main)

    this.tiles = def.tiles.map((t) => {
      const video = createVideo(t.src, 'qm-pieces-tile')
      Object.assign(video.style, {
        left: pct(t.x, plan.width),
        top: pct(t.y, plan.height),
        width: pct(t.w, plan.width),
        height: pct(t.h, plan.height),
      })
      this.el.append(video)
      return { def: t, video, started: false, visible: false, worstDrift: 0, jumps: 0 }
    })

    for (const im of def.images) this.el.append(createImage(im, plan))

    parent.append(this.el)
    this.loaded = Promise.all([waitForData(this.main), ...this.tiles.map((t) => waitForData(t.video))]).then((oks) =>
      oks.every(Boolean)
    )
  }

  get totalFrames(): number {
    return this.def.frames
  }

  // Arranca desde offsetS (segundos dentro del tramo; >0 si esta máquina llegó tarde).
  start(offsetS: number): number {
    this.started = true
    this.startTime = Math.max(0, Math.min(offsetS, this.totalFrames / this.fps - 0.05))
    if (this.startTime > 0) this.main.currentTime = this.startTime
    // Visible desde que arranca: queda debajo del actual hasta el empalme.
    this.el.classList.remove('qm-pieces-segment--waiting')
    this.playAt = performance.now()
    this.main.play().catch((err: unknown) => console.warn(`[quickMoneyPieces] ${this.def.id}: play() falló`, err))
    return this.playAt
  }

  // Un paso del reloj. Devuelve la demora del play() si en este paso empezó a moverse.
  tick(now: number): number | null {
    const t = this.main.currentTime
    this.frame = Math.min(this.totalFrames - 1, Math.floor(t * this.fps + 0.01))
    let delay: number | null = null
    if (this.started && !this.moving && t > this.startTime + 0.001) {
      this.moving = true
      delay = now - this.playAt
    }
    if (this.started) this.syncTiles(t)
    return delay
  }

  private syncTiles(plateTime: number) {
    for (const tile of this.tiles) {
      const due = plateTime - tile.def.fromFrame / this.fps // tiempo que el recorte tiene que mostrar
      const v = tile.video
      if (!tile.started) {
        if (due >= -TILE_LEAD_FRAMES / this.fps) {
          tile.started = true
          // El plate ya pasó su entrada (máquina que llegó tarde, o carga lenta): entra a tiempo.
          if (due > 1 / this.fps) v.currentTime = due
          v.play().catch((err: unknown) => console.warn(`[quickMoneyPieces] recorte ${tile.def.src}: play() falló`, err))
        }
        continue
      }
      if (v.ended || this.main.ended) continue
      if (!tile.visible) {
        // Se muestra recién cuando de verdad avanzó: hasta ahí la zona la cubre el plate, que ahí
        // tiene la jaula mostrando 0 y se ve bien.
        if (v.currentTime > 0) {
          tile.visible = true
          v.classList.add('qm-pieces-tile--visible')
        }
        continue
      }
      const drift = (v.currentTime - due) * this.fps // + adelantado
      tile.worstDrift = Math.max(tile.worstDrift, Math.abs(drift))
      if (Math.abs(drift) >= JUMP_FRAMES) {
        v.currentTime = Math.max(0, due + 2 / this.fps)
        v.playbackRate = 1
        tile.jumps++
      } else if (Math.abs(drift) > DEADBAND_FRAMES) {
        // Proporcional y suave: un cambio brusco de velocidad se nota.
        v.playbackRate = 1 - Math.max(-0.12, Math.min(0.12, drift * 0.04))
      } else if (v.playbackRate !== 1) {
        v.playbackRate = 1
      }
    }
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true
    for (const v of this.el.querySelectorAll('video')) {
      v.pause()
      v.removeAttribute('src')
      v.load()
    }
    this.el.remove()
  }
}

function createImage(im: PiecesImage, plan: PiecesPlan): HTMLImageElement {
  const img = document.createElement('img')
  img.className = `qm-pieces-image qm-pieces-image--${im.kind}`
  img.src = im.src
  img.alt = ''
  img.style.left = `${(im.x / plan.width) * 100}%`
  img.style.top = `${(im.y / plan.height) * 100}%`
  img.style.height = `${(im.height / plan.height) * 100}%`
  return img
}

export class PiecesPlayer {
  private readonly opts: PiecesPlayerOptions
  private readonly segmentDefs: PiecesSegment[]
  private readonly segments: (Segment | undefined)[] = []
  private current = 0
  private playDelayMs = INITIAL_PLAY_DELAY_MS
  private raf = 0
  private destroyed = false
  private ended = false

  constructor(opts: PiecesPlayerOptions) {
    this.opts = opts
    this.segmentDefs = [...opts.plan.segments]
  }

  // Arranca alineado al reloj del que lo usa: elapsedMs() = ms desde la hora del sorteo (puede
  // crecer mientras carga). Resuelve cuando el primer tramo ya se está reproduciendo.
  async start(elapsedMs: () => number): Promise<void> {
    const fps = this.opts.plan.fps
    let index = this.segmentIndexAt(elapsedMs())
    this.ensure(index)
    this.ensure(index + 1)
    this.ensure(index + 2)
    const ok = await this.segments[index]!.loaded
    if (this.destroyed) return
    if (!ok) return this.fail(new Error(`no cargó ${this.segmentDefs[index].src}`))

    // Mientras cargaba pudo pasar el tiempo de este tramo (muy raro): recalcular.
    let offsetS = elapsedMs() / 1000 - this.framesBefore(index) / fps
    while (index < this.segmentDefs.length - 1 && offsetS >= this.segmentDefs[index].frames / fps) {
      this.segments[index]?.destroy()
      index++
      this.ensure(index + 2)
      offsetS = elapsedMs() / 1000 - this.framesBefore(index) / fps
    }
    this.current = index
    for (let i = 0; i < index; i++) this.segments[i]?.destroy()
    this.segments[index]!.start(Math.max(0, offsetS))
    this.raf = requestAnimationFrame((now) => this.tick(now))
  }

  destroy() {
    this.destroyed = true
    cancelAnimationFrame(this.raf)
    for (const s of this.segments) s?.destroy()
  }

  private framesBefore(index: number): number {
    return this.segmentDefs.slice(0, index).reduce((sum, s) => sum + s.frames, 0)
  }

  private segmentIndexAt(elapsedMs: number): number {
    let frame = Math.max(0, (elapsedMs / 1000) * this.opts.plan.fps)
    for (let i = 0; i < this.segmentDefs.length; i++) {
      if (frame < this.segmentDefs[i].frames) return i
      frame -= this.segmentDefs[i].frames
    }
    return this.segmentDefs.length - 1
  }

  private ensure(index: number): Segment | undefined {
    if (index >= this.segmentDefs.length) return undefined
    if (!this.segments[index]) {
      // El que suena va arriba; los que esperan, abajo (y ocultos hasta arrancar).
      this.segments[index] = new Segment(this.segmentDefs[index], this.opts.plan, 100 - index, this.opts.container)
    }
    return this.segments[index]
  }

  private fail(err: Error) {
    if (this.destroyed) return
    this.destroy()
    this.opts.onError(err)
  }

  private tick(now: number) {
    if (this.destroyed || this.ended) return
    const i = this.current
    const seg = this.segments[i]!
    let next = this.segments[i + 1]
    seg.tick(now)

    const fps = this.opts.plan.fps
    const remainingMs = (seg.totalFrames / fps - seg.main.currentTime) * 1000
    if (next && !next.started && remainingMs <= this.playDelayMs) {
      // La transición es la única pieza prescindible: si falta, se pasa directo a las 4 jaulas.
      if (next.def.id === 'transition' && next.main.error) {
        console.warn('[quickMoneyPieces] falta la transición de este pick 3 -- se saltea', next.def.src)
        next.destroy()
        this.segmentDefs.splice(i + 1, 1)
        this.segments.splice(i + 1, 1)
        next = this.ensure(i + 1)
        this.ensure(i + 2)
      }
      if (next?.main.error) return this.fail(new Error(`no cargó ${next.def.src}`))
      next?.start(0)
    }

    if (next?.started) {
      const delay = next.tick(now)
      if (delay !== null) this.playDelayMs = Math.min(300, Math.max(40, 0.5 * this.playDelayMs + 0.5 * delay))
      if (seg.endSeenAt === null && seg.main.ended) seg.endSeenAt = now
      const overdue = seg.endSeenAt !== null && now - seg.endSeenAt > MAX_SWAP_WAIT_MS
      if (next.moving || overdue) this.swap(i, overdue)
    } else if (!next && seg.main.ended) {
      this.ended = true
      this.logSummary(seg)
      this.opts.onEnded()
      return
    }
    this.raf = requestAnimationFrame((t) => this.tick(t))
  }

  // Saca el tramo i (que estaba arriba) y deja sonando el i+1.
  private swap(i: number, overdue: boolean) {
    const seg = this.segments[i]!
    const next = this.segments[i + 1]!
    // Empalme: frames del anterior que no se vieron + frames del siguiente que corrieron tapados.
    const lost = Math.max(0, seg.totalFrames - 1 - seg.frame) + next.frame
    if (lost > 2 || overdue) {
      console.warn(`[quickMoneyPieces] empalme ${seg.def.id} -> ${next.def.id}: ${lost} frames perdidos` +
        (overdue ? ' (el siguiente tardó en arrancar)' : ''))
    }
    this.logSummary(seg)
    seg.destroy()
    this.current = i + 1
    this.ensure(i + 2)
    this.ensure(i + 3)
  }

  private logSummary(seg: Segment) {
    const bad = seg.tiles.filter((t) => t.worstDrift > 2 || t.jumps > 0)
    if (bad.length === 0) return
    console.warn(`[quickMoneyPieces] ${seg.def.id}: recortes desfasados`,
      bad.map((t) => ({ src: t.def.src, peorDesfaseFrames: Number(t.worstDrift.toFixed(1)), saltos: t.jumps })))
  }
}
