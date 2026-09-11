import { Application } from '@pixi/react'
import { ResponsiveStage } from '../../layout/ResponsiveStage'
import { LiveTableBetsPanel } from './LiveTableBetsPanel'
import type { LiveTableBetsData } from '../../types/liveTableBets'
import './liveTableBetsOverlay.css'

// Canvas Pixi propio para LiveTableBetsPanel -- necesario porque el video de resultado
// (.video-pool-slot, z-index:5) vive por encima del canvas PRINCIPAL (z-index:0) a propósito
// (tapa Header/Footer/rueda mientras juega, ver videoPool.css), así que cualquier cosa montada
// DENTRO de ese canvas principal queda tapada por el video igual que ellos. Un <Application>
// separado, posicionado por CSS con su propio z-index por encima del video (ver
// liveTableBetsOverlay.css), es la única forma de que este panel se vea "arriba" del video
// siendo 100% Pixi (WinnerPanel resuelve el mismo problema pero en DOM, con z-index:20).
export function LiveTableBetsOverlay({ data }: { data: LiveTableBetsData }) {
  return (
    <Application
      className="live-table-bets-overlay-canvas"
      autoDensity={true}
      resizeTo={window}
      resolution={Math.min(window.devicePixelRatio || 1, 2)}
      powerPreference="high-performance"
      backgroundAlpha={0}
    >
      <ResponsiveStage>
        <LiveTableBetsPanel data={data} />
      </ResponsiveStage>
    </Application>
  )
}
