import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'

// Sincroniza el animation-delay de un grupo rotante con la fase actual de .lobby-wheel-rotor,
// leída vía Web Animations API -- necesario porque el grupo puede montar en cualquier momento
// (Fast Refresh, datos que llegan tarde, etc.), bastante después de que la rueda real ya lleva
// rato girando. Sin esto, el grupo arranca su animación desde 0% y queda desfasado para siempre.
export function useWheelRotationSync(rotorGroupRef: RefObject<SVGGElement | null>, durationSec: number) {
  useLayoutEffect(() => {
    const rotorAnimation = document.querySelector('.lobby-wheel-rotor')?.getAnimations()[0]
    if (!rotorAnimation || !rotorGroupRef.current) return

    const currentTimeMs = Number(rotorAnimation.currentTime ?? 0)
    const durationMs = durationSec * 1000
    rotorGroupRef.current.style.animationDelay = `${-(currentTimeMs % durationMs)}ms`
  }, [durationSec])
}
