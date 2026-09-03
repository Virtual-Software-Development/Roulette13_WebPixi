import type { WheelType } from '../types/wheel'
import { AMERICAN_POCKET_ANGLE_DEG_BY_FRAME } from './wheelVideoGeometry.american.frames'

// Geometría del loop de video del lobby (local-media/Lobby/lobby_loop_*.webm) -- separada de
// WHEEL_GEOMETRY (wheelGeometry.constants.ts) a propósito: el video no es el mismo asset visual
// que Base_*.png/Rotor_*.png (no comparte canvas, centro ni radio).
//
// No hay una sola tabla de ángulos + una fórmula de rotación: el video tiene perspectiva de
// cámara real (no es un render cenital como el PNG), así que la separación angular ENTRE
// casillas cambia con el tiempo -- verificado midiendo la tabla completa en varios puntos del
// loop y comparando el espaciado relativo entre casillas contra el frame 0: la deriva llega a
// ~3.6° en la mitad del loop, no es ruido de medición. Una rotación rígida (offset único sobre
// una tabla fija) nunca calza en el 100% del recorrido por eso.
//
// La solución: pocketAngleDegByFrame trae los ángulos medidos en CADA uno de los 480 frames
// reales del video (60fps × 8s), no una fórmula. En tiempo de ejecución se indexa directo por
// el número de frame real que está pintando el <video> (ver useWheelVideoPocketGeometry.ts,
// que usa video.requestVideoFrameCallback para saber exactamente qué frame es), sin interpolar
// ni asumir nada sobre la velocidad de giro.
//
// Medido con OpenCV: centro por Hough circle sobre el frame 0, ángulos por el mismo barrido de
// color de wheelGeometry.constants.ts (clasificar rojo/negro/verde en pasos de 0.05° sobre el
// anillo de números) aplicado a los 480 frames, verificado en dos radios de muestreo (220 y
// 310px, con 0.84° de diferencia promedio entre ambos) y promediado. Si se reemplaza el archivo
// de video hay que remedir todo (centro, radio y la tabla por frame no tienen por qué seguir
// valiendo).
export interface WheelVideoGeometry {
  // Ruta relativa (para buildMediaUrl) del archivo de video.
  videoAsset: string
  // Resolución nativa del video (video.videoWidth/video.videoHeight) -- NO es 2560x1440 como
  // los PNG, aunque comparte el mismo aspect ratio 16:9.
  canvasWidth: number
  canvasHeight: number
  // Centro real del rotor en el frame 0, detectado por Hough circle sobre el borde exterior de
  // la rueda (no es el centro geométrico del frame -- la composición del video no está
  // perfectamente centrada). Se asume estable en todos los frames (una cámara fija filmando una
  // rueda que gira sobre su propio eje no debería mover el centro aparente).
  center: { x: number; y: number }
  // Radio del anillo de números -- la banda con color de pocket (rojo/negro/verde) va de
  // ~200px a ~330px de radio; 265 es el punto medio de esa banda.
  radius: number
  // Frames por segundo reales del archivo (video.duration × fps === pocketAngleDegByFrame.length).
  fps: number
  // pocketAngleDegByFrame[frameIndex][i] = ángulo (grados) de getWheelOrder('american')[i] en
  // ESE frame exacto del video. Ver wheelVideoGeometry.american.frames.ts (generado, no editar
  // a mano).
  pocketAngleDegByFrame: number[][]
}

export const WHEEL_VIDEO_GEOMETRY: Partial<Record<WheelType, WheelVideoGeometry>> = {
  american: {
    videoAsset: 'Lobby/lobby_loop_american.webm',
    canvasWidth: 1920,
    canvasHeight: 1080,
    // Re-medido para el render actual del video (ver wheelVideoGeometry.american.frames.ts) --
    // centro por ajuste de círculo (mínimos cuadrados) sobre el contorno del borde exterior de la
    // rueda, radio = el usado para el barrido de color que generó la tabla de ángulos.
    center: { x: 958.549, y: 540.019 },
    radius: 260.43,
    fps: 60,
    pocketAngleDegByFrame: AMERICAN_POCKET_ANGLE_DEG_BY_FRAME,
  },
}
