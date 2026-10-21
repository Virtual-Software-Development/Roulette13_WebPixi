import { buildMediaUrl } from '../../utils/media'

// Video del sorteo de Quick Money armado POR PIEZAS en el navegador, en vez del MP4 que renderiza el
// backend por sorteo (ver QuickMoneyPiecesView). Las piezas las genera QuickMoney_Video_Generator
// (prep_player.py) una sola vez y se copian a local-media/QuickMoney/ (npm run quick-money-pieces):
//
//   a1, a2         intro, igual siempre
//   plate3         fondo + 3 jaulas mostrando 0   + 1 recorte por dígito != 0
//   transición     una de las 1000 armadas (trans/t<pick3>.mp4)
//   plate4         fondo + 4 jaulas mostrando 0   + 1 recorte por dígito != 0
//   resultado      a3 + PNG de las bolas y las placas PICK 3 / PICK 4
//
// Todo H.264 sin transparencia. Un recorte es la zona de UNA jaula con su dígito ya mezclado: las
// zonas no se pisan, así que van opacas encima del plate, en su (x, y) de 1920x1080, y entran en el
// frame `desde` del plate (cuando sale la bola).

// Carpeta dentro de local-media (servida en /media/).
export const QUICK_MONEY_PIECES_DIR = 'QuickMoney'

// player.json de prep_player.py -- solo lo que se usa acá.
export interface PiecesManifest {
  fps: number
  ancho: number
  alto: number
  intro: { src: string; frames: number }[]
  jaulas: Record<'3' | '4', {
    plate: string
    frames: number
    pos: Record<string, { rect: [number, number, number, number]; desde: Record<string, number> }>
  }>
  transicion: { patron: string; frames: number }
  outro: { src: string; frames: number }
  resultado: {
    bolas: string[]
    bola_alto: number
    bola_visible: number
    bola_gap: number
    x: number
    y3: number
    y4: number
    etiquetas: Record<'3' | '4', string>
    etiqueta_alto: number
    etiqueta_sep: number
  }
}

export interface PiecesTile {
  src: string
  // Rectángulo en coordenadas del video (1920x1080).
  x: number
  y: number
  w: number
  h: number
  // Frame del plate en que entra (la bola sale ahí).
  fromFrame: number
}

export interface PiecesImage {
  src: string
  // 'ball' se centra en (x, y); 'label' se alinea por su derecha contra x.
  kind: 'ball' | 'label'
  x: number
  y: number
  height: number
}

export interface PiecesSegment {
  id: 'a1' | 'a2' | 'cages3' | 'transition' | 'cages4' | 'result'
  src: string
  frames: number
  tiles: PiecesTile[]
  images: PiecesImage[]
}

export interface PiecesPlan {
  fps: number
  width: number
  height: number
  segments: PiecesSegment[]
  totalFrames: number
}

export function piecesUrl(relativePath: string): string {
  return buildMediaUrl(`${QUICK_MONEY_PIECES_DIR}/${relativePath}`)
}

let manifestPromise: Promise<PiecesManifest> | null = null

// Se pide una vez por sesión: las piezas no cambian mientras el lobby está abierto. Si falla se
// olvida, así el próximo sorteo lo vuelve a intentar.
export function loadPiecesManifest(): Promise<PiecesManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch(piecesUrl('player.json'), { cache: 'no-store' }).then(async (res) => {
      if (!res.ok) throw new Error(`${QUICK_MONEY_PIECES_DIR}/player.json respondió ${res.status}`)
      return (await res.json()) as PiecesManifest
    })
    manifestPromise.catch(() => {
      manifestPromise = null
    })
  }
  return manifestPromise
}

// La lista de reproducción de un sorteo: qué video va, en qué orden y qué va encima. Pura (sin DOM
// ni red) para poder testearla.
export function buildPiecesPlan(m: PiecesManifest, pick3: number[], pick4: number[]): PiecesPlan {
  if (pick3.length !== 3 || pick4.length !== 4 || [...pick3, ...pick4].some((d) => !Number.isInteger(d) || d < 0 || d > 9)) {
    throw new Error(`buildPiecesPlan: resultado inválido ${pick3.join('')}-${pick4.join('')}`)
  }

  const cages = (pick: 3 | 4, digits: number[], id: 'cages3' | 'cages4'): PiecesSegment => {
    const j = m.jaulas[String(pick) as '3' | '4']
    const tiles: PiecesTile[] = []
    digits.forEach((d, i) => {
      if (d === 0) return // el plate ya muestra un 0 en cada jaula
      const p = j.pos[String(i + 1)]
      const [x, y, w, h] = p.rect
      tiles.push({ src: piecesUrl(`tiles/c${pick}_${i + 1}_${d}.mp4`), x, y, w, h, fromFrame: p.desde[String(d)] })
    })
    return { id, src: piecesUrl(j.plate), frames: j.frames, tiles, images: [] }
  }

  // Resultado: bolas centradas en (x, y); placas alineadas por su derecha contra el borde VISIBLE de
  // la primera bola (el PNG es un lienzo más ancho que la bola).
  const r = m.resultado
  const step = r.bola_alto * r.bola_gap
  const labelRight = r.x - (r.bola_alto * r.bola_visible) / 2 - r.etiqueta_sep
  const row = (digits: number[], y: number): PiecesImage[] =>
    digits.map((d, i) => ({ src: piecesUrl(r.bolas[d]), kind: 'ball', x: r.x + i * step, y, height: r.bola_alto }))

  const segments: PiecesSegment[] = [
    { id: 'a1', src: piecesUrl(m.intro[0].src), frames: m.intro[0].frames, tiles: [], images: [] },
    { id: 'a2', src: piecesUrl(m.intro[1].src), frames: m.intro[1].frames, tiles: [], images: [] },
    cages(3, pick3, 'cages3'),
    {
      id: 'transition',
      src: piecesUrl(m.transicion.patron.replace('{p3}', pick3.join(''))),
      frames: m.transicion.frames,
      tiles: [],
      images: [],
    },
    cages(4, pick4, 'cages4'),
    {
      id: 'result',
      src: piecesUrl(m.outro.src),
      frames: m.outro.frames,
      tiles: [],
      images: [
        { src: piecesUrl(r.etiquetas['3']), kind: 'label', x: labelRight, y: r.y3, height: r.etiqueta_alto },
        { src: piecesUrl(r.etiquetas['4']), kind: 'label', x: labelRight, y: r.y4, height: r.etiqueta_alto },
        ...row(pick3, r.y3),
        ...row(pick4, r.y4),
      ],
    },
  ]

  return {
    fps: m.fps,
    width: m.ancho,
    height: m.alto,
    segments,
    totalFrames: segments.reduce((sum, s) => sum + s.frames, 0),
  }
}
