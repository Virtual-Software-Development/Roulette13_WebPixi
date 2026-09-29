import { useEffect, useState } from 'react'

// Reloj vivo genérico (re-render cada intervalMs) -- usado por el bloque de fecha/hora del Header
// en modo admin (ver Header.tsx). No depende de ningún store: es puramente UI, cada consumidor
// decide cómo formatear el Date que devuelve.
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
