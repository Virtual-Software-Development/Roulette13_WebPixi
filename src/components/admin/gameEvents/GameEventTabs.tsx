import { useTranslation } from 'react-i18next'
import './gameEventDetail.css'

export type GameEventTab = 'overview' | 'payouts'

const TAB_DEFS: { id: GameEventTab; labelKey: string }[] = [
  { id: 'overview', labelKey: 'admin.gameEvents.tabs.overview' },
  { id: 'payouts', labelKey: 'admin.gameEvents.tabs.payouts' },
]

interface GameEventTabsProps {
  active: GameEventTab
  onChange: (tab: GameEventTab) => void
}

// Solo Overview/Payouts (pedido explícito: Results ya vive dentro de Overview, Logs se accede vía
// "View Draw Log") -- mismo lenguaje visual que RtpManagementTabs (rojo = selección), pero sin
// acoplarse a ese componente porque sus tabs/íconos son específicos de RTP Management.
export function GameEventTabs({ active, onChange }: GameEventTabsProps) {
  const { t } = useTranslation()

  return (
    <div className="admin-game-events-tabs" role="tablist">
      {TAB_DEFS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className="admin-game-events-tab"
          data-active={active === tab.id}
          onClick={() => onChange(tab.id)}
        >
          {t(tab.labelKey)}
        </button>
      ))}
    </div>
  )
}
