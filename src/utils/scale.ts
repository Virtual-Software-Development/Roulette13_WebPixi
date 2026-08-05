export interface CoverFit {
  width: number
  height: number
  x: number
  y: number
}

// object-fit: cover — llena target completamente preservando el aspect ratio de source, recorta el sobrante
export function getCoverFit(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): CoverFit {
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale

  return {
    width,
    height,
    x: (targetWidth - width) / 2,
    y: (targetHeight - height) / 2,
  }
}

// multiplica un tamaño de diseño por el factor de escala del viewport (para íconos/sprites de tamaño fijo)
export function scaleSize(width: number, height: number, scale: number) {
  return { width: width * scale, height: height * scale }
}
