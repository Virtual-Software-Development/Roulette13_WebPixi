import { describe, expect, it } from 'vitest'
import { buildPiecesPlan, piecesUrl, type PiecesManifest } from '../video/quickMoneyPieces/plan'

// Recorte del player.json real de prep_player.py (QuickMoney_Video_Generator).
const desde = (n: number) => Object.fromEntries(Array.from({ length: 9 }, (_, i) => [String(i + 1), n]))
const MANIFEST: PiecesManifest = {
  fps: 24,
  ancho: 1920,
  alto: 1080,
  intro: [
    { src: 'a1.mp4', frames: 200 },
    { src: 'a2.mp4', frames: 370 },
  ],
  jaulas: {
    '3': {
      plate: 'plate3.mp4',
      frames: 440,
      pos: {
        '1': { rect: [264, 194, 470, 662], desde: desde(106) },
        '2': { rect: [734, 194, 456, 662], desde: desde(196) },
        '3': { rect: [1190, 194, 470, 662], desde: desde(286) },
      },
    },
    '4': {
      plate: 'plate4.mp4',
      frames: 560,
      pos: {
        '1': { rect: [24, 194, 480, 664], desde: desde(106) },
        '2': { rect: [504, 194, 450, 662], desde: desde(196) },
        '3': { rect: [966, 194, 450, 662], desde: desde(286) },
        '4': { rect: [1416, 194, 480, 664], desde: desde(376) },
      },
    },
  },
  transicion: { patron: 'trans/t{p3}.mp4', frames: 29 },
  outro: { src: 'a3.mp4', frames: 144 },
  resultado: {
    bolas: Array.from({ length: 10 }, (_, d) => `img/Image${String(d + 1).padStart(4, '0')}.png`),
    bola_alto: 280,
    bola_visible: 678 / 1080,
    bola_gap: 0.95,
    x: 900,
    y3: 480,
    y4: 780,
    etiquetas: { '3': 'img/label_pick3.png', '4': 'img/label_pick4.png' },
    etiqueta_alto: 76,
    etiqueta_sep: 44,
  },
}

describe('buildPiecesPlan', () => {
  it('arma los 6 tramos en orden y dura lo mismo que el MP4 del backend (1743 frames = 72.6s)', () => {
    const plan = buildPiecesPlan(MANIFEST, [7, 3, 9], [4, 8, 1, 6])
    expect(plan.segments.map((s) => s.id)).toEqual(['a1', 'a2', 'cages3', 'transition', 'cages4', 'result'])
    expect(plan.totalFrames).toBe(1743)
  })

  it('pone un recorte por dígito en su jaula, en su rectángulo y su frame de entrada', () => {
    const plan = buildPiecesPlan(MANIFEST, [7, 3, 9], [4, 8, 1, 6])
    const cages3 = plan.segments[2]
    expect(cages3.src).toBe(piecesUrl('plate3.mp4'))
    expect(cages3.tiles).toEqual([
      { src: piecesUrl('tiles/c3_1_7.mp4'), x: 264, y: 194, w: 470, h: 662, fromFrame: 106 },
      { src: piecesUrl('tiles/c3_2_3.mp4'), x: 734, y: 194, w: 456, h: 662, fromFrame: 196 },
      { src: piecesUrl('tiles/c3_3_9.mp4'), x: 1190, y: 194, w: 470, h: 662, fromFrame: 286 },
    ])
    expect(plan.segments[4].tiles.map((t) => t.src)).toEqual(
      ['tiles/c4_1_4.mp4', 'tiles/c4_2_8.mp4', 'tiles/c4_3_1.mp4', 'tiles/c4_4_6.mp4'].map(piecesUrl)
    )
  })

  it('un 0 no lleva recorte: el plate ya muestra un 0 en cada jaula', () => {
    const plan = buildPiecesPlan(MANIFEST, [5, 0, 8], [0, 0, 0, 0])
    expect(plan.segments[2].tiles.map((t) => t.src)).toEqual([piecesUrl('tiles/c3_1_5.mp4'), piecesUrl('tiles/c3_3_8.mp4')])
    expect(plan.segments[4].tiles).toEqual([])
  })

  it('elige la transición del pick 3 respetando los ceros a la izquierda', () => {
    const plan = buildPiecesPlan(MANIFEST, [0, 4, 7], [1, 2, 3, 0])
    expect(plan.segments[3].src).toBe(piecesUrl('trans/t047.mp4'))
  })

  it('el resultado lleva las placas y las bolas de cada dígito en su fila', () => {
    const plan = buildPiecesPlan(MANIFEST, [7, 3, 9], [4, 8, 1, 6])
    const images = plan.segments[5].images
    const balls = images.filter((im) => im.kind === 'ball')
    expect(balls.map((b) => b.src)).toEqual(
      ['img/Image0008.png', 'img/Image0004.png', 'img/Image0010.png', 'img/Image0005.png', 'img/Image0009.png',
        'img/Image0002.png', 'img/Image0007.png'].map(piecesUrl)
    )
    expect(balls.slice(0, 3).map((b) => b.y)).toEqual([480, 480, 480])
    expect(balls.slice(3).map((b) => b.y)).toEqual([780, 780, 780, 780])
    expect(balls[1].x - balls[0].x).toBeCloseTo(280 * 0.95)
    const labels = images.filter((im) => im.kind === 'label')
    expect(labels.map((l) => l.src)).toEqual([piecesUrl('img/label_pick3.png'), piecesUrl('img/label_pick4.png')])
    // Alineadas por su derecha contra el borde VISIBLE de la primera bola, como en sorteo.py.
    expect(labels[0].x).toBeCloseTo(900 - (280 * 678) / 1080 / 2 - 44)
  })

  it('rechaza un resultado mal formado en vez de pedir piezas que no existen', () => {
    expect(() => buildPiecesPlan(MANIFEST, [7, 3], [4, 8, 1, 6])).toThrow()
    expect(() => buildPiecesPlan(MANIFEST, [7, 3, 10], [4, 8, 1, 6])).toThrow()
  })

  it('las piezas se piden a local-media/QuickMoney por /media/', () => {
    expect(piecesUrl('tiles/c3_1_7.mp4')).toBe('/media/QuickMoney%2Ftiles%2Fc3_1_7.mp4')
  })
})
