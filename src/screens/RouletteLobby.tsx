import { useEffect } from 'react'
import { SharedLayout } from '../layout/SharedLayout'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { LastGame } from '../components/results/LastGame'
import { GameList } from '../components/results/GameList'
import { NumberPanelHotCold } from '../components/numberPanel/NumberPanelHotCold'
import { SpinStatsPanel } from '../components/spinStats/SpinStatsPanel'

export function RouletteLobby() {
  const setGameConfig = useGameConfigStore((state) => state.setGameConfig)

  useEffect(() => {
    setGameConfig({
      showLogo: true
    })
  }, [setGameConfig])

  return (
    <>
      <NumberPanelHotCold />
      <SpinStatsPanel />
      <SharedLayout hideBackground>
        <LastGame />
        <GameList />
      </SharedLayout>
    </>
  )
}
