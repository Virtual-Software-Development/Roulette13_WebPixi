import { useState } from 'react'
import { RouletteVideoView } from './screens/RouletteVideoView'
import { ResultsView } from './screens/ResultsView'

function App() {
  const [screen] = useState<'video' | 'results'>('results')

  return screen === 'video' ? <RouletteVideoView /> : <ResultsView />
}

export default App
