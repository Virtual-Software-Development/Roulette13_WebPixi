import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RouletteVideoView } from './screens/RouletteVideoView'
import { ResultsView } from './screens/ResultsView'

function App() {
  const [screen] = useState<'video' | 'results'>('results')
  const { i18n } = useTranslation()

  return (
    <>
      {screen === 'video' ? <RouletteVideoView /> : <ResultsView />}
      <div style={{ position: 'fixed', top: 8, left: 8, zIndex: 10, display: 'flex', gap: 4 }}>
        <button onClick={() => i18n.changeLanguage('en-US')}>EN</button>
        <button onClick={() => i18n.changeLanguage('es')}>ES</button>
      </div>
    </>
  )
}

export default App
