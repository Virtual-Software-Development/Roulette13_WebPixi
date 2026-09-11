import { Application } from '@pixi/react'
import { ResponsiveStage } from '../../layout/ResponsiveStage'
import { LeftStatsSidebar } from './LeftStatsSidebar'
import type { LiveTableBetsData } from '../../types/liveTableBets'
import './leftStatsSidebarOverlay.css'

// Canvas Pixi propio para LeftStatsSidebar -- mismo motivo/arquitectura exacta que
// LiveTableBetsOverlay.tsx/ResultStatsOverlay.tsx (ver comentario ahí): el video de resultado tapa
// el canvas principal por diseño, así que cualquier gráfico Pixi que deba verse ENCIMA del video
// necesita su propio <Application> con z-index más alto. Canvas separado de los otros dos overlays
// (no un children/slot compartido) para que los tres sigan siendo independientes entre sí.
export function LeftStatsSidebarOverlay({ data }: { data: LiveTableBetsData }) {
  return (
    <Application
      className="left-stats-sidebar-overlay-canvas"
      autoDensity={true}
      resizeTo={window}
      resolution={Math.min(window.devicePixelRatio || 1, 2)}
      powerPreference="high-performance"
      backgroundAlpha={0}
    >
      <ResponsiveStage>
        <LeftStatsSidebar data={data} />
      </ResponsiveStage>
    </Application>
  )
}
