export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// Arranca rápido (velocidad máxima en t=0) y desacelera hasta el final -- a diferencia de
// easeInOutCubic (arranque lento), para movimientos que deben sentirse "disparados" desde el
// primer instante (ver LastWinnerBallLayer: la bolita saliendo del número).
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

// Inverso de easeOutCubic: arranca lento y acelera hasta el final -- para animaciones de SALIDA
// que deben sentirse como "aspiradas" hacia su destino final en vez de frenar de golpe (ver
// ResultStatsPanel, cuyo HUD se retrae hacia abajo al terminar el video de resultado).
export function easeInCubic(t: number): number {
  return t * t * t
}
