import { useEffect } from 'react'
import i18n from '../i18n'
import { SharedLayout } from '../layout/SharedLayout'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useResultsStore } from '../store/useResultsStore'
import { WinnerCard } from '../components/results/WinnerCard'
import { ResultsTable } from '../components/results/ResultsTable'
import backgroundUrl from '../assets/background-test.jpg'
import logoUrl from '../assets/logo-central.png'
import drawImageUrl from '../assets/drawBox.png'

const SIMULATOR_INTERVAL_MS = 5000
const MAX_RESULTS = 10

export function ResultsView() {
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
      drawImageUrl,
      drawNumber: '38483478',
      nextDrawTime: '03:00 PM'
    })
    setMaxResults(MAX_RESULTS)
  }, [setGameConfig, setMaxResults])

  useEffect(() => {
    if (!import.meta.env.DEV) return

    const interval = setInterval(() => {
      useResultsStore.getState().addResult({
        id: crypto.randomUUID(),
        time: new Date().toLocaleTimeString(i18n.language, { hour: 'numeric', minute: '2-digit' }),
        drawNumber: String(Math.floor(Math.random() * 99999)).padStart(5, '0'),
        winningNumber: Math.floor(Math.random() * 13),
      })
    }, SIMULATOR_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [])

  return (
    <SharedLayout>
      <WinnerCard />
      <ResultsTable />
    </SharedLayout>
  )
}
