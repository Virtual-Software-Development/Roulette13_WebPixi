import { Application } from '@pixi/react'
import { ResponsiveStage } from '../../layout/ResponsiveStage'
import { ResultStatsPanel } from './ResultStatsPanel'
import type { ResultStatsData } from '../../types/resultStats'
import './resultStatsOverlay.css'

// Canvas Pixi propio para ResultStatsPanel -- mismo motivo/arquitectura exacta que
// LiveTableBetsOverlay.tsx (ver comentario ahí): el video de resultado tapa el canvas principal
// por diseño, así que cualquier gráfico Pixi que deba verse ENCIMA del video necesita su propio
// <Application> con z-index más alto. Deliberadamente un canvas separado del de
// LiveTableBetsOverlay (no un children/slot compartido) para que ambos overlays sigan siendo
// completamente independientes entre sí.
export function ResultStatsOverlay({ data }: { data: ResultStatsData }) {
  return (
    <Application
      className="result-stats-overlay-canvas"
      autoDensity={true}
      resizeTo={window}
      resolution={Math.min(window.devicePixelRatio || 1, 2)}
      powerPreference="high-performance"
      backgroundAlpha={0}
    >
      <ResponsiveStage>
        <ResultStatsPanel data={data} />
      </ResponsiveStage>
    </Application>
  )
}
