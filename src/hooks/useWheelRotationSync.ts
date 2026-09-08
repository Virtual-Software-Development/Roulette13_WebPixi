import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'
import { useDrawCycleStore } from '../store/useDrawCycleStore'

// Cada cuánto se vuelve a leer la fase real de .lobby-wheel-rotor y realinear -- no alcanza con
// sincronizar una sola vez al montar (ver comentario de abajo): en una build que corre días sin
// recargar (pantalla/kiosco), cualquier hipo puntual del navegador (throttling de la pestaña,
// recuperación de contexto GPU, lo que sea) puede dejar a ESTE overlay desfasado del resto para
// siempre, porque nada más lo vuelve a corregir. Reintentar cada 5s autocorrige cualquier
// desfasaje que se cuele, sin depender de detectarlo ni de un reload manual -- la operación en sí
// (leer/asignar Animation.currentTime, transform-only, sin layout) es barata incluso en hardware
// débil, así que bajar el intervalo no tiene costo real hasta valores mucho menores (~1-2s).
const RESYNC_INTERVAL_MS = 5_000

// Sincroniza la fase de un grupo rotante con la de .lobby-wheel-rotor -- necesario porque el
// grupo puede montar en cualquier momento (Fast Refresh, datos que llegan tarde, etc.), bastante
// después de que la rueda real ya lleva rato girando. Sin esto, el grupo arranca su animación
// desde 0% y queda desfasado para siempre. Se repite cada RESYNC_INTERVAL_MS (no solo al montar)
// para autocorregir cualquier desfasaje que aparezca más adelante durante una sesión larga.
//
// IMPORTANTE: reasignar `animation-delay` (string) sobre una animación que YA lleva un rato
// corriendo NO la reposiciona -- el navegador reinterpreta el nuevo delay contra el momento en
// que esa animación arrancó originalmente (su "start time"), no contra "ahora". El resultado es
// que cada resync periódico introducía un corrimiento nuevo (proporcional a cuánto llevaba
// corriendo desde que montó) en vez de corregir el desfasaje -- lo empeoraba en vez de arreglarlo
// (confirmado en vivo). `animation-delay` como string SOLO da el resultado esperado la primera
// vez, mientras la animación todavía no existe como objeto Animation (se aplica ANTES de que
// nazca). Para cualquier resync posterior hay que usar un seek de verdad: Animation.currentTime
// (Web Animations API) SÍ reposiciona de forma absoluta sin importar cuánto lleve corriendo.
export function useWheelRotationSync(rotorGroupRef: RefObject<SVGGElement | null>, durationSec: number) {
  useLayoutEffect(() => {
    const durationMs = durationSec * 1000

    const sync = () => {
      const rotorAnimation = document.querySelector('.lobby-wheel-rotor')?.getAnimations()[0]
      const group = rotorGroupRef.current
      if (!rotorAnimation || !group) return

      const targetTimeMs = Number(rotorAnimation.currentTime ?? 0) % durationMs
      const groupAnimation = group.getAnimations()[0]

      if (groupAnimation) {
        // La animación de este grupo ya existe -- seek absoluto, funciona sin importar cuánto
        // lleve corriendo (a diferencia de reasignar animation-delay, ver comentario de arriba).
        groupAnimation.currentTime = targetTimeMs
      } else {
        // Recién montado: la animación todavía no existe como objeto Animation (el navegador la
        // crea en el próximo recálculo de estilos) -- acá SÍ corresponde animation-delay como
        // string, porque se aplica antes de que la animación nazca.
        group.style.animationDelay = `${-targetTimeMs}ms`
      }
    }

    sync()
    // Red de seguridad para un grupo RECIÉN montado (p. ej. HotColdNumberChipLayer, que monta de
    // cero cada vez que reaparece, bastante después de que .lobby-wheel-rotor ya lleva rato
    // girando): el primer sync() de arriba puede caer justo antes de que el navegador termine de
    // crear el objeto Animation de ESTE grupo (confirmado en vivo -- se ve desfasado hasta el
    // primer resync periódico, varios segundos después), en cuyo caso toma la rama de
    // animation-delay como string en vez del seek confiable. Un segundo intento en el próximo
    // frame (para entonces el Animation ya existe seguro) corrige eso casi al instante en vez de
    // esperar hasta RESYNC_INTERVAL_MS.
    const rafId = requestAnimationFrame(sync)
    const intervalId = setInterval(sync, RESYNC_INTERVAL_MS)

    // Resync inmediato apenas la rueda de imagen retoma girando -- mismo criterio de "congelada"
    // que usa LobbyBackgroundLayer para pausar/resetear .lobby-wheel-rotor (videoSlideProgress
    // llega a 1). Relevante para un grupo que se queda montado durante TODO el freeze (a
    // diferencia de HotColdNumberChipLayer, que se desmonta/remonta -- ver el rAF de arriba para
    // ese caso): sin esto podía quedar hasta RESYNC_INTERVAL_MS desalineado del rotor real justo
    // cuando vuelve a ser relevante (highlights que recién ahí empiezan a mostrarse de nuevo).
    let wasFrozen = useDrawCycleStore.getState().videoSlideProgress >= 1
    const unsubscribe = useDrawCycleStore.subscribe((state) => {
      const isFrozen = state.videoSlideProgress >= 1
      if (wasFrozen && !isFrozen) sync()
      wasFrozen = isFrozen
    })

    return () => {
      cancelAnimationFrame(rafId)
      clearInterval(intervalId)
      unsubscribe()
    }
  }, [durationSec, rotorGroupRef])
}
