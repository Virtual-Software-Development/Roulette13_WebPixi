import { useEffect } from 'react'
import { SharedLayout } from '../layout/SharedLayout'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useResultsStore } from '../store/useResultsStore'
import { WinnerCard } from '../components/results/WinnerCard'
import { ResultsTable } from '../components/results/ResultsTable'
import { PlayDrawButton } from '../components/results/PlayDrawButton'
import backgroundUrl from '../assets/background-test.jpg'
import logoUrl from '../assets/logo-central.png'

const MAX_RESULTS = 10

interface ResultsViewProps {
  onStartDraw?: () => void
}

export function ResultsView({ onStartDraw }: ResultsViewProps) {
  const setGameConfig = useGameConfigStore((state) => state.setGameConfig)
  const setMaxResults = useResultsStore((state) => state.setMaxResults)

  useEffect(() => {
    setGameConfig({
      gameName: 'Roulette 13',
      logoUrl,
      backgroundUrl,
      showTitle: true,
      showDateTime: true,
      showDrawInfo: true,
      showLogo: true,
      drawNumber: '38483478',
      nextDrawTime: '03:00 PM'
    })
    setMaxResults(MAX_RESULTS)
  }, [setGameConfig, setMaxResults])

  return (
    <SharedLayout>
      <WinnerCard />
      <ResultsTable />
      <PlayDrawButton onTap={onStartDraw} />
    </SharedLayout>
  )
}
