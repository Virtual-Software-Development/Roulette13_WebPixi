import { useEffect } from 'react'
import { SharedLayout } from '../layout/SharedLayout'
import { Header } from '../layout/Header'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { LastGame } from '../components/results/LastGame'
import { GameList } from '../components/results/GameList'

export function RouletteLobby() {
  const setGameConfig = useGameConfigStore((state) => state.setGameConfig)

  useEffect(() => {
    setGameConfig({
      showDrawInfo: true,
      showLogo: true
    })
  }, [setGameConfig])

  return (
    <>
      <Header />
      <SharedLayout hideBackground>
        <LastGame />
        <GameList />
      </SharedLayout>
    </>
  )
}
