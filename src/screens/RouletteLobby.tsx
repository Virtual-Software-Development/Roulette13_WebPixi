import { useEffect } from 'react'
import { SharedLayout } from '../layout/SharedLayout'
import { Header } from '../layout/Header'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { LastGame } from '../components/results/LastGame'
import { GameList } from '../components/results/GameList'
import { NumberPanelHotCold } from '../components/numberPanel/NumberPanelHotCold'
import { SpinStatsPanel } from '../components/spinStats/SpinStatsPanel'

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
      <NumberPanelHotCold />
      <SpinStatsPanel />
      <SharedLayout hideBackground>
        <LastGame />
        <GameList />
      </SharedLayout>
    </>
  )
}
