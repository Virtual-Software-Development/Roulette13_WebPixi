import { useTranslation } from 'react-i18next'
import { RouletteNextResultPanel } from '../components/admin/nextResults/RouletteNextResultPanel'
import { QuickMoneyNextResultPanel } from '../components/admin/nextResults/QuickMoneyNextResultPanel'
import './nextResultsPage.css'

export type NextResultsSection = 'roulette' | 'quickMoney'

interface NextResultsPageProps {
  section: NextResultsSection
}

// Contenido puro (sin Header/Sidebar propios), mismo criterio que AdminDashboardPage/
// RtpManagementPage -- el shell lo monta AdminPanel.tsx vía AdminLayout. Roulette y Quick Money
// viven en vistas separadas (pedido explícito) -- cada sub-item del sidebar ("Roulette"/"Quick
// Money" bajo "Next Results") renderiza solo su propio panel, a ancho completo.
export function NextResultsPage({ section }: NextResultsPageProps) {
  const { t } = useTranslation()

  return (
    <>
      <div className="admin-main-topbar">
        <div>
          <h1 className="admin-main-title">{t('admin.nextResults.title')}</h1>
          <p className="admin-main-subtitle">{t('admin.nextResults.subtitle')}</p>
        </div>
      </div>

      <div className="admin-next-results-grid" data-single="true" data-section={section}>
        {section === 'roulette' && <RouletteNextResultPanel />}
        {section === 'quickMoney' && <QuickMoneyNextResultPanel />}
      </div>
    </>
  )
}
