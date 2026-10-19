import { useEffect } from 'react'
import { SharedLayout } from '../layout/SharedLayout'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useRoundHistoryStore } from '../store/useRoundHistoryStore'
import { LastGame } from '../components/results/LastGame'
import { GameList } from '../components/results/GameList'
import { NumberPanelHotCold } from '../components/numberPanel/NumberPanelHotCold'
import { SpinStatsPanel } from '../components/spinStats/SpinStatsPanel'
import { LobbyLiveBetsPanel } from '../components/lobbyLiveBets/LobbyLiveBetsPanel'

export function RouletteLobby() {
  const setGameConfig = useGameConfigStore((state) => state.setGameConfig)
  // Abre el pop-up del historial (DOM, ver RoundHistoryModal.tsx, montado en App.tsx) en Roulette.
  const openHistory = useRoundHistoryStore((state) => state.open)
  const openRoundHistory = () => openHistory('roulette')

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
        <GameList onViewHistory={openRoundHistory} />
      </SharedLayout>
      <LobbyLiveBetsPanel />
    </>
  )
}
