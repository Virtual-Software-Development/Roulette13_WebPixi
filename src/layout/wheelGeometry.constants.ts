import type { WheelType } from '../types/wheel'

// Geometría de la rueda dentro del canvas de Base_*.png / Rotor_*.png -- dentro de cada tipo,
// ambos PNG comparten el mismo canvas de 2560x1440 y están centrados en el mismo punto
// (verificado analizando el canal alfa de cada imagen). Todo se expresa en unidades directas de
// ese canvas (no normalizado 0..1) porque el overlay de depuración usa un
// <svg viewBox="0 0 2560 1440">, que reproduce el mismo letterboxing que object-fit:contain en
// las <img> (ver lobbyBackgroundLayer.css) sin tener que reimplementar ese cálculo a mano.

export const WHEEL_CANVAS_WIDTH = 2560
export const WHEEL_CANVAS_HEIGHT = 1440

// Duración de una vuelta completa del rotor -- fuente única compartida por la animación CSS de
// .lobby-wheel-rotor y la del grupo de puntos de LobbyWheelDebugOverlay, para que no se
// desincronicen si se cambia el valor. Vale para cualquier tipo de rueda.
export const WHEEL_SPIN_DURATION_SEC = 8

export interface WheelGeometry {
  // Ruta relativa (para buildMediaUrl) de la imagen estática y la que gira.
  baseAsset: string
  rotorAsset: string
  // Centro del rotor, medido por canal alfa (componente conectado más grande, para ignorar
  // artefactos sueltos de la imagen).
  center: { x: number; y: number }
  // Radio del anillo de números (no el radio total de la rueda) -- medido muestreando la banda
  // de color entre el pocket "0" y el centro hasta encontrar dónde caen los píxeles del texto.
  radius: number
  // Ángulo (grados, 0 = arriba, sentido horario) de cada casilla, en el mismo orden que
  // getWheelOrder(type) -- pocketAngleDeg[i] es el ángulo real de order[i] en el frame estático
  // del PNG. Medido barriendo el anillo de números en pasos de 0.1° a este radio, clasificando
  // el color (rojo/negro/verde) en cada paso, y tomando el punto medio de cada tramo contiguo
  // del mismo color.
  //
  // No usamos "offset del '0' + espaciado uniforme (360/N)" porque el render no es perfectamente
  // cenital: el desvío respecto al espaciado uniforme crece con la distancia angular al "0" hasta
  // ~5° en el extremo opuesto de la rueda (media casilla) -- suficiente para que un punto caiga
  // sobre el número vecino en vez del correcto. Midiendo cada casilla por separado no hace falta
  // asumir espaciado uniforme.
  pocketAngleDeg: number[]
}

export const WHEEL_GEOMETRY: Record<WheelType, WheelGeometry> = {
  european: {
    baseAsset: 'Lobby/Base_European.png',
    rotorAsset: 'Lobby/Rotor_European.png',
    center: { x: 1276, y: 718 },
    radius: 380,
    // Orden: EUROPEAN_WHEEL_ORDER (0, 32, 15, 19, ...). El desvío medido acá respecto al
    // espaciado uniforme es chico (<1°) -- por eso no se notaba antes de medir la americana.
    pocketAngleDeg: [
      85.4, 95.1, 104.8, 114.5, 124.25, 133.95, 143.55, 153.25, 162.85, 172.5, 182.2, 191.8,
      201.45, 211.1, 221.05, 230.85, 240.6, 250.45, 260.25, 269.95, 279.75, 289.55, 299.3, 309.1,
      318.95, 328.9, 338.65, 348.35, 358.25, 8.15, 17.75, 27.4, 37.0, 46.7, 56.4, 66.05, 75.9,
    ],
  },
  american: {
    baseAsset: 'Lobby/Base_American.png',
    rotorAsset: 'Lobby/Rotor_American.png',
    center: { x: 1276, y: 718 },
    radius: 380,
    // Orden: AMERICAN_WHEEL_ORDER (0, 28, 9, 26, ..., 1, '00', 27, ...). Acá el desvío respecto
    // al espaciado uniforme sí es grande (hasta ~5°, cerca de '00', el lado opuesto al '0') --
    // por eso hacía falta esta tabla en vez de un solo offset.
    pocketAngleDeg: [
      86.1, 95.9, 105.65, 115.4, 125.1, 134.7, 144.3, 154.05, 163.65, 173.2, 182.75, 192.5,
      202.1, 211.9, 221.75, 231.6, 241.35, 251.05, 260.9, 270.7, 280.0, 289.1, 298.35, 307.55,
      316.8, 326.15, 335.5, 344.7, 353.9, 3.3, 12.7, 21.7, 30.9, 40.05, 49.2, 58.3, 67.5, 76.8,
    ],
  },
}
