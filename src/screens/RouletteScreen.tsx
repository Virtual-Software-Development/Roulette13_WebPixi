import { useEffect } from 'react'
import { SharedLayout } from '../layout/SharedLayout'
import { useGameConfigStore } from '../store/useGameConfigStore'
import backgroundUrl from '../assets/hero.png'
import logoUrl from '../assets/logo-central.png'

export function RouletteScreen() {
  const setGameConfig = useGameConfigStore((state) => state.setGameConfig)

  useEffect(() => {
    setGameConfig({
      gameName: 'Roulette 13',
      logoUrl,
      backgroundUrl,
    })
  }, [setGameConfig])

  return <SharedLayout />
}
