// Todos los diamantes de un mismo grupo (misma columna/docena) son visualmente idénticos --
// mismo tamaño, mismo color de trazo, mismo glow -- y solo cambian de posición/rotación según la
// casilla. Antes, cada instancia (hasta 3 apiladas x 12 casillas para columnas) dibujaba su
// propio <filter><feDropShadow>, y el navegador tenía que rasterizar ese blur de forma
// independiente en cada una, todos los frames que la casilla se re-posiciona (ver
// useWheelVideoPocketGeometry.ts). Acá se prerenderiza el diamante+glow UNA sola vez por estilo
// (ancho/alto/colores/blur) como un <svg> standalone servido por data URI, cacheado por esa
// combinación -- todas las instancias con el mismo estilo comparten el mismo data URI, así que el
// navegador decodifica/rasteriza el bitmap una sola vez y lo reutiliza como textura en cada
// <image>, en vez de recalcular el filtro por instancia.
export interface DiamondGlowSpriteOptions {
  width: number
  height: number
  strokeColor: string
  glowColor: string
  strokeWidth: number
  glowBlur: number
}

export interface DiamondGlowSprite {
  url: string
  // Tamaño total del sprite (width/height + padding para no recortar el blur) y el offset desde
  // el centro del diamante hasta la esquina superior izquierda del sprite -- listos para usar
  // directo como x/y/width/height de un <image> centrado en el origen del <g> del pocket.
  spriteWidth: number
  spriteHeight: number
  offsetX: number
  offsetY: number
}

const spriteCache = new Map<string, DiamondGlowSprite>()

function buildSpriteSvg(options: DiamondGlowSpriteOptions, padding: number): string {
  const { width, height, strokeColor, glowColor, strokeWidth, glowBlur } = options
  const spriteWidth = width + padding * 2
  const spriteHeight = height + padding * 2
  const halfW = width / 2
  const halfH = height / 2
  const cx = spriteWidth / 2
  const cy = spriteHeight / 2
  const points = [`${cx},${cy - halfH}`, `${cx + halfW},${cy}`, `${cx},${cy + halfH}`, `${cx - halfW},${cy}`].join(' ')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${spriteWidth}" height="${spriteHeight}" viewBox="0 0 ${spriteWidth} ${spriteHeight}">` +
    `<filter id="g" x="-50%" y="-50%" width="200%" height="200%">` +
    `<feDropShadow dx="0" dy="0" stdDeviation="${glowBlur}" flood-color="${glowColor}" flood-opacity="1" />` +
    `</filter>` +
    `<polygon points="${points}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" filter="url(#g)" />` +
    `</svg>`
  )
}

// Padding suficiente para que el feDropShadow (que se difumina ~3x su stdDeviation) no se recorte
// contra el borde del sprite.
function paddingFor(glowBlur: number): number {
  return Math.ceil(glowBlur * 3)
}

export function getDiamondGlowSprite(options: DiamondGlowSpriteOptions): DiamondGlowSprite {
  const key = `${options.width}x${options.height}|${options.strokeColor}|${options.glowColor}|${options.strokeWidth}|${options.glowBlur}`
  const cached = spriteCache.get(key)
  if (cached) return cached

  const padding = paddingFor(options.glowBlur)
  const svg = buildSpriteSvg(options, padding)
  const sprite: DiamondGlowSprite = {
    url: `data:image/svg+xml;base64,${btoa(svg)}`,
    spriteWidth: options.width + padding * 2,
    spriteHeight: options.height + padding * 2,
    offsetX: -(options.width / 2 + padding),
    offsetY: -(options.height / 2 + padding),
  }
  spriteCache.set(key, sprite)
  return sprite
}
