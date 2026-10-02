import { DRAW_VIDEO_SLOT_ID, QUICK_MONEY_VIDEO_SLOT_ID } from './videoElements'
import './videoPool.css'

// Los <video> reales del DOM que reproducen los videos de sorteo — se montan una única vez y para
// siempre (nunca condicional), porque el resto del código los busca por id vía
// getVideoSlot()/document.getElementById en cualquier momento, asumiendo que ya existen.
// El video del loop de lobby vive aparte, en LobbyBackgroundLayer (necesita apilarse
// DETRÁS del canvas de Pixi en vez de encima, ver videoPool.css).
export function VideoPoolLayer() {
  return (
    <div className="video-pool-layer">
      <video id={DRAW_VIDEO_SLOT_ID} className="video-pool-slot" playsInline preload="auto" />
      <video id={QUICK_MONEY_VIDEO_SLOT_ID} className="video-pool-slot--quick-money" playsInline preload="auto" />
    </div>
  )
}
