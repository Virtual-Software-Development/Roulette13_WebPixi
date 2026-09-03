import { ACTIVE_WHEEL_TYPE } from '../data/wheelOrder'
import { getEffectiveWheelRenderMode } from '../data/wheelRenderMode'
import { WHEEL_CANVAS_HEIGHT, WHEEL_CANVAS_WIDTH } from '../layout/wheelGeometry.constants'
import { WHEEL_VIDEO_GEOMETRY } from '../layout/wheelVideoGeometry.constants'
import { getPocketAngleDegForGeometry, getPocketPositionForGeometry } from '../utils/wheelPositions'
import { WheelRotorGroup } from '../components/wheel/WheelRotorGroup'
import './lobbyWheelDebugOverlay.css'
import { useEffect } from 'react'

// Prende/apaga los puntos de calibración sin sacar el componente del árbol -- cambiar acá y
// guardar alcanza para ocultarlos/mostrarlos de nuevo (hot reload), más rápido que comentar el
// JSX. Solo tiene efecto en dev (ver chequeo de import.meta.env.DEV más abajo).
const SHOW_DEBUG_POCKETS = false

// Radio del círculo -- independiente por modo (el canvas de video es más chico que el de imagen,
// 1920x1080 vs 2560x1440, así que el mismo radio se ve proporcionalmente más grande ahí). El
// tamaño de la fuente del número tiene su propio ajuste por modo en lobbyWheelDebugOverlay.css
// (clase lobby-wheel-debug-pocket--video). Ajustar a mano.
const DEBUG_POCKET_RADIUS = 16
const DEBUG_POCKET_VIDEO_RADIUS = 10

// Corrección de posición SOLO en modo video -- mismo motivo que CHIP_VIDEO_X_OFFSET en
// HotColdNumberChip.tsx: geometry.center/radius se midieron por ajuste de círculo + barrido de
// color sobre el video, así que la posición calculada puede no calzar 100% exacto con el número
// impreso. RADIUS_OFFSET mueve el punto a lo largo del eje radial (positivo = más lejos del
// centro), X_OFFSET se suma directo al x del translate() del <g>. Ajustar a mano viendo el video
// en vivo (server de dev con HMR). En modo imagen no se aplica ninguno de los dos.
const DEBUG_POCKET_VIDEO_RADIUS_OFFSET = 8
const DEBUG_POCKET_VIDEO_X_OFFSET = 0

// Referencia visual para calibrar WHEEL_GEOMETRY (modo imagen, wheelGeometry.constants.ts) o
// WHEEL_VIDEO_GEOMETRY (modo video, wheelVideoGeometry.constants.ts -- ver
// data/wheelRenderMode.ts) contra los números reales impresos en el rotor/video de
// ACTIVE_WHEEL_TYPE. viewBox="0 0 <canvasWidth> <canvasHeight>" reproduce el mismo letterboxing
// que object-fit:contain en las <img>/<video> de LobbyBackgroundLayer, así que las coordenadas
// del canvas de cada fuente valen tal cual, sin convertir a porcentajes del contenedor. El grupo
// de puntos sigue la rotación real vía WheelRotorGroup (CSS-phase-sync en imagen,
// video.currentTime en video) en vez de recalcular posiciones a mano. Solo en dev.
export function LobbyWheelDebugOverlay() {
  if (!import.meta.env.DEV || !SHOW_DEBUG_POCKETS) return null

  const mode = getEffectiveWheelRenderMode(ACTIVE_WHEEL_TYPE)
  const isVideoMode = mode === 'video'
  const videoGeometry = WHEEL_VIDEO_GEOMETRY[ACTIVE_WHEEL_TYPE]
  const canvasWidth = isVideoMode && videoGeometry ? videoGeometry.canvasWidth : WHEEL_CANVAS_WIDTH
  const canvasHeight = isVideoMode && videoGeometry ? videoGeometry.canvasHeight : WHEEL_CANVAS_HEIGHT
  const pocketRadius = isVideoMode ? DEBUG_POCKET_VIDEO_RADIUS : DEBUG_POCKET_RADIUS

  useEffect(() => {
    
  }, [])

  return (
    <svg
      className="lobby-wheel-debug-overlay"
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <WheelRotorGroup wheelType={ACTIVE_WHEEL_TYPE} className="lobby-wheel-debug-rotor-group">
        {(geometry, order) =>
          order.map((pocket) => {
            const radiusOffset = isVideoMode ? DEBUG_POCKET_VIDEO_RADIUS_OFFSET : 0
            const { x, y } = getPocketPositionForGeometry(pocket, ACTIVE_WHEEL_TYPE, geometry, radiusOffset)
            const translateX = isVideoMode ? x + DEBUG_POCKET_VIDEO_X_OFFSET : x
            const angleDeg = getPocketAngleDegForGeometry(pocket, ACTIVE_WHEEL_TYPE, geometry)
            return (
              <g
                key={pocket}
                className={`lobby-wheel-debug-pocket${isVideoMode ? ' lobby-wheel-debug-pocket--video' : ''}`}
                transform={`translate(${translateX}, ${y}) rotate(${angleDeg})`}
              >
                <circle r={pocketRadius} />
                <text dy="0.35em">{pocket}</text>
              </g>
            )
          })
        }
      </WheelRotorGroup>
    </svg>
  )
}
