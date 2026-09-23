import { useTranslation } from 'react-i18next'
import type { QuickMoneyTabValue } from './quickMoneyBettingTypes'
import './gameTypeTabs.css'

// "Play Both" oculto por el momento (no solo deshabilitado): con 3 tabs a flex:1 c/u ocupaba un
// tercio del ancho aunque no se pudiera tocar. Al sacarlo del array, Pick 3/Pick 4 se reparten el
// ancho completo entre los dos. `QuickMoneyTabValue` sigue incluyendo 'both' (tipo de dominio de
// GameTypeTabs, no de este archivo) para reactivarlo más adelante sin tocar el resto del flujo.
const TABS: QuickMoneyTabValue[] = ['pick3', 'pick4']

interface GameTypeTabsProps {
  active: QuickMoneyTabValue
  onChange: (value: QuickMoneyTabValue) => void
}

// Controla qué grupo(s) de dígitos muestra DigitEntryCard -- estado local del workspace (no
// store), es UI de una sola pantalla, ningún otro componente necesita leerlo desde afuera.
export function GameTypeTabs({ active, onChange }: GameTypeTabsProps) {
  const { t } = useTranslation()

  return (
    <div className="qm-tabs" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          className="qm-tab"
          data-accent={tab}
          aria-selected={active === tab}
          data-active={active === tab}
          onClick={() => onChange(tab)}
        >
          {t(`quickMoneyBettingView.gameType.${tab}`)}
        </button>
      ))}
    </div>
  )
}
