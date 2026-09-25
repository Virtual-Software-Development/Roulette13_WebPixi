import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminTabs, type AdminTabDef } from '../components/admin/AdminTabs'
import { RouletteVideoLibraryTab } from '../components/admin/videos/RouletteVideoLibraryTab'
import { QuickMoneyVideoStatusTab } from '../components/admin/videos/QuickMoneyVideoStatusTab'
import { UploadHistoryTab } from '../components/admin/videos/UploadHistoryTab'
import { UploadVideoModal } from '../components/admin/videos/UploadVideoModal'
import { useAdminVideosStore } from '../store/useAdminVideosStore'
import { RefreshIcon, UploadCloudIcon } from '../components/admin/videos/icons'
import '../components/admin/videos/adminVideosShared.css'

export type VideoManagementTab = 'roulette' | 'quickMoney' | 'uploadHistory'

interface VideoManagementPageProps {
  initialTab: VideoManagementTab
  // Cada tab es su propia "view" de AdminPanel (ver AdminPanel.tsx) -- cambiar de tab acá adentro
  // reusa el mismo mecanismo que ya sincroniza ?preview= sin reload, en vez de un router nuevo.
  onNavigate: (view: string) => void
}

const VIEW_BY_TAB: Record<VideoManagementTab, string> = {
  roulette: 'admin-videos-roulette',
  quickMoney: 'admin-videos-quick-money',
  uploadHistory: 'admin-videos-upload-history',
}

interface UploadModalState {
  game: 'roulette' | 'quickMoney'
  lockGame: boolean
  targetId?: string
}

// Shell único de Admin > Videos (pedido explícito: "un shell común, cambiar contenido mediante
// tabs", no 3 páginas pegadas). Cada tab decide sus propias columnas/filtros/métricas -- ver
// RouletteVideoLibraryTab/QuickMoneyVideoStatusTab/UploadHistoryTab -- esto solo comparte header,
// tabs, y el modal de Upload Video (única acción de subida para los 3).
export function VideoManagementPage({ initialTab, onNavigate }: VideoManagementPageProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<VideoManagementTab>(initialTab)
  const [uploadModal, setUploadModal] = useState<UploadModalState | null>(null)
  // Preselección al navegar desde Upload History > Open Related Video -- se consume una sola vez
  // (el tab de destino se monta de nuevo cada vez que se vuelve activo, ver conditional render
  // abajo), así que no hace falta limpiarlo explícitamente.
  const [focusTarget, setFocusTarget] = useState<{ tab: VideoManagementTab; id: string } | null>(null)

  const rescanRouletteLibrary = useAdminVideosStore((s) => s.rescanRouletteLibrary)
  const refreshQuickMoneyStatus = useAdminVideosStore((s) => s.refreshQuickMoneyStatus)

  const tabs: AdminTabDef<VideoManagementTab>[] = [
    { id: 'roulette', label: t('admin.videos.tabs.roulette') },
    { id: 'quickMoney', label: t('admin.videos.tabs.quickMoney') },
    { id: 'uploadHistory', label: t('admin.videos.tabs.uploadHistory') },
  ]

  const handleTabChange = (tab: VideoManagementTab) => {
    setActiveTab(tab)
    onNavigate(VIEW_BY_TAB[tab])
  }

  const handleOpenRelated = (game: 'roulette' | 'quickMoney', relatedId: string) => {
    const tab: VideoManagementTab = game
    setFocusTarget({ tab, id: relatedId })
    handleTabChange(tab)
  }

  const handleRefresh = () => {
    if (activeTab === 'roulette') rescanRouletteLibrary()
    else if (activeTab === 'quickMoney') refreshQuickMoneyStatus()
    // Upload History es de solo lectura -- no tiene una operación de refresh propia (los datos
    // vienen de las mismas acciones de Roulette/Quick Money).
  }

  const refreshLabel =
    activeTab === 'roulette'
      ? t('admin.videos.roulette.actions.rescan')
      : activeTab === 'quickMoney'
        ? t('admin.videos.quickMoney.actions.refresh')
        : t('admin.videos.uploadHistory.actions.refresh')

  return (
    <>
      <div className="admin-main-topbar">
        <div>
          <h1 className="admin-main-title">{t('admin.videos.title')}</h1>
          <p className="admin-main-subtitle">{t('admin.videos.subtitle')}</p>
        </div>
        <div className="admin-videos-topbar-actions">
          {activeTab !== 'uploadHistory' && (
            <button type="button" className="admin-videos-btn admin-videos-btn--ghost" onClick={handleRefresh}>
              <RefreshIcon />
              {refreshLabel}
            </button>
          )}
          <button
            type="button"
            className="admin-videos-btn admin-videos-btn--primary"
            onClick={() => setUploadModal({ game: activeTab === 'quickMoney' ? 'quickMoney' : 'roulette', lockGame: activeTab !== 'uploadHistory' })}
          >
            <UploadCloudIcon />
            {t('admin.videos.shared.actions.uploadVideo')}
          </button>
        </div>
      </div>

      <AdminTabs tabs={tabs} active={activeTab} onChange={handleTabChange} />

      {activeTab === 'roulette' && (
        <RouletteVideoLibraryTab
          onOpenUpload={(targetId) => setUploadModal({ game: 'roulette', lockGame: true, targetId })}
          initialSelectedId={focusTarget?.tab === 'roulette' ? focusTarget.id : undefined}
        />
      )}
      {activeTab === 'quickMoney' && (
        <QuickMoneyVideoStatusTab
          onOpenUpload={(targetId) => setUploadModal({ game: 'quickMoney', lockGame: true, targetId })}
          initialSelectedId={focusTarget?.tab === 'quickMoney' ? focusTarget.id : undefined}
        />
      )}
      {activeTab === 'uploadHistory' && <UploadHistoryTab onOpenRelated={handleOpenRelated} />}

      {uploadModal && (
        <UploadVideoModal
          game={uploadModal.game}
          lockGame={uploadModal.lockGame}
          initialTargetId={uploadModal.targetId}
          onClose={() => setUploadModal(null)}
          onUploaded={() => setUploadModal(null)}
        />
      )}
    </>
  )
}
