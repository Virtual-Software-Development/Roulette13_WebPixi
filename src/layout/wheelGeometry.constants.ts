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
    // Medido directo sobre Rotor_American.png (scripts/measure-wheel-image-angles.py, ajuste de
    // círculo por mínimos cuadrados sobre el canal alfa del PNG). Reemplaza la medición vieja
    // (1276, 718) -- esta imagen es un asset independiente del video (no comparten orientación de
    // render), así que no tiene por qué coincidir con WHEEL_VIDEO_GEOMETRY.american ni con
    // AMERICAN_POCKET_ANGLE_DEG_BY_FRAME.
    center: { x: 1279.53, y: 719.47 },
    radius: 320.35,
    // Orden: AMERICAN_WHEEL_ORDER (0, 28, 9, 26, ..., 1, '00', 27, ...). Medido con
    // measure-wheel-image-angles.py: barrido angular de color (rojo/negro/verde) directo sobre
    // Rotor_American.png, sin OCR, con phase-lock contra la secuencia de colores conocida del paño
    // americano -- mismo método que measure-wheel-video-angles.py pero aplicado a la imagen
    // estática en vez de frames de video, y por lo tanto medido una sola vez (no hay rotación que
    // resolver). Validado con 17 radios de muestreo distintos (todos con phase-lock 38/38); el
    // desvío entre esas 17 mediciones independientes fue de hasta ~0.05° por casilla (promedio de
    // los 17 usado acá). Reemplaza la tabla vieja, que en realidad ya no describía este PNG
    // (Rotor_American.png fue reemplazado por un render nuevo -- por eso el desvío respecto al
    // espaciado uniforme (360/38) también cambió de forma, aunque sigue sin ser uniforme: hasta
    // ~2.4° cerca del extremo opuesto al '0').
    pocketAngleDeg: [
      180.0, 189.47, 198.95, 208.42, 217.89, 227.36, 236.86, 246.33, 255.78, 265.25, 274.76,
      284.22, 293.63, 303.15, 312.62, 322.1, 331.57, 341.05, 350.53, 0.0, 9.45, 18.94, 28.43,
      37.88, 47.38, 56.85, 66.35, 75.81, 85.3, 94.71, 104.22, 113.68, 123.17, 132.64, 142.16,
      151.58, 161.06, 170.51,
    ],
  },
}
