import { useEffect } from 'react'
import { SharedLayout } from '../layout/SharedLayout'
import { useGameConfigStore } from '../store/useGameConfigStore'
// import { WinnerCard } from '../components/results/WinnerCard'
// import { ResultsTable } from '../components/results/ResultsTable'

export function ResultsView() {
  const setGameConfig = useGameConfigStore((state) => state.setGameConfig)

  useEffect(() => {
    setGameConfig({
      showTitle: true,
      showDateTime: true,
      showDrawInfo: true,
      showLogo: true
    })
  }, [setGameConfig])

  return (
    <SharedLayout hideBackground>
      {/* WinnerCard y tabla ocultos temporalmente, sin eliminar los componentes */}
      {/* <WinnerCard /> */}
      {/* <ResultsTable /> */}
    </SharedLayout>
  )
}
