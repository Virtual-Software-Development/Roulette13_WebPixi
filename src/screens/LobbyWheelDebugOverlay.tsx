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
const SHOW_DEBUG_POCKETS = true

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
  const videoGeometry = WHEEL_VIDEO_GEOMETRY[ACTIVE_WHEEL_TYPE]
  const canvasWidth = mode === 'video' && videoGeometry ? videoGeometry.canvasWidth : WHEEL_CANVAS_WIDTH
  const canvasHeight = mode === 'video' && videoGeometry ? videoGeometry.canvasHeight : WHEEL_CANVAS_HEIGHT

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
            const { x, y } = getPocketPositionForGeometry(pocket, ACTIVE_WHEEL_TYPE, geometry)
            const angleDeg = getPocketAngleDegForGeometry(pocket, ACTIVE_WHEEL_TYPE, geometry)
            return (
              <g
                key={pocket}
                className="lobby-wheel-debug-pocket"
                transform={`translate(${x}, ${y}) rotate(${angleDeg})`}
              >
                <circle r={16} />
                <text dy="0.35em">{pocket}</text>
              </g>
            )
          })
        }
      </WheelRotorGroup>
    </svg>
  )
}
