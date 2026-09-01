import { useRef } from 'react'
import type { ReactNode } from 'react'
import { getEffectiveWheelRenderMode } from '../../data/wheelRenderMode'
import { getWheelOrder } from '../../data/wheelOrder'
import { WHEEL_GEOMETRY, WHEEL_SPIN_DURATION_SEC } from '../../layout/wheelGeometry.constants'
import { WHEEL_VIDEO_GEOMETRY } from '../../layout/wheelVideoGeometry.constants'
import { useWheelRotationSync } from '../../hooks/useWheelRotationSync'
import { useWheelVideoPocketGeometry } from '../../hooks/useWheelVideoPocketGeometry'
import type { PocketGeometry } from '../../utils/wheelPositions'
import type { WheelPocket, WheelType } from '../../types/wheel'

interface WheelRotorGroupProps {
  wheelType: WheelType
  // Clase del <g> rotor -- cada Layer sigue siendo dueña de su propio nombre/CSS (igual que hoy),
  // este componente solo decide QUÉ mecanismo de rotación aplicarle.
  className: string
  // Render-prop: recibe la geometría (imagen o video, según el modo activo) y el orden de
  // casillas ya resueltos, para que el caller dibuje los pockets sin tener que preguntar el modo
  // por su cuenta ni elegir entre getPocket*ForGeometry a mano.
  children: (geometry: PocketGeometry, order: WheelPocket[]) => ReactNode
}

// Punto único donde se decide "imagen o video" para el rotor de la rueda -- usado por
// LobbyWheelDebugOverlay, NumberCellHighlightLayer y HotColdNumberChipLayer en vez de que cada
// uno maneje su propio ref/hook/geometría. La rama imagen reproduce EXACTAMENTE el código que
// antes vivía inline en esos tres componentes (mismo hook, misma fuente de center/duración), así
// que en modo imagen el comportamiento no cambia.
export function WheelRotorGroup({ wheelType, className, children }: WheelRotorGroupProps) {
  const mode = getEffectiveWheelRenderMode(wheelType)
  return mode === 'video' ? (
    <VideoRotorGroup wheelType={wheelType} className={className}>
      {children}
    </VideoRotorGroup>
  ) : (
    <ImageRotorGroup wheelType={wheelType} className={className}>
      {children}
    </ImageRotorGroup>
  )
}

function ImageRotorGroup({ wheelType, className, children }: WheelRotorGroupProps) {
  const rotorGroupRef = useRef<SVGGElement>(null)
  useWheelRotationSync(rotorGroupRef, WHEEL_SPIN_DURATION_SEC)
  const geometry = WHEEL_GEOMETRY[wheelType]

  return (
    <g
      ref={rotorGroupRef}
      className={className}
      style={{ transformOrigin: `${geometry.center.x}px ${geometry.center.y}px`, animationDuration: `${WHEEL_SPIN_DURATION_SEC}s` }}
    >
      {children(geometry, getWheelOrder(wheelType))}
    </g>
  )
}

function VideoRotorGroup({ wheelType, className, children }: WheelRotorGroupProps) {
  // Garantizado por getEffectiveWheelRenderMode: solo devuelve 'video' cuando esta entrada existe.
  const videoGeometry = WHEEL_VIDEO_GEOMETRY[wheelType]!
  // A diferencia del modo imagen, acá no hay un solo <g> que "gira" -- cada pocket ya viene con
  // su ángulo absoluto medido para el frame real que está pintando el video en este instante
  // (ver useWheelVideoPocketGeometry.ts: el video tiene perspectiva real, la separación entre
  // casillas no es constante, así que no alcanza con rotar una tabla fija). Por eso no hace
  // falta transformOrigin/animationName acá: no hay transform de rotación que anular.
  const geometry = useWheelVideoPocketGeometry(videoGeometry)

  return (
    // animationName:'none' neutraliza el @keyframes lobby-wheel-spin que la clase declara para
    // el modo imagen -- ya no queda implícito en un animationDuration en 0 (más frágil), queda
    // anulado explícitamente.
    <g className={className} style={{ animationName: 'none' }}>
      {children(geometry, getWheelOrder(wheelType))}
    </g>
  )
}
