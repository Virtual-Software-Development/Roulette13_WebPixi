import { DRAW_VIDEO_SLOT_ID } from './videoElements'
import './videoPool.css'

// El <video> real del DOM que reproduce el video de sorteo — se monta una única vez y para
// siempre (nunca condicional), porque el resto del código lo busca por id vía
// getVideoSlot()/document.getElementById en cualquier momento, asumiendo que ya existe.
// El video del loop de lobby vive aparte, en LobbyBackgroundLayer (necesita apilarse
// DETRÁS del canvas de Pixi en vez de encima, ver videoPool.css).
export function VideoPoolLayer() {
  return (
    <div className="video-pool-layer">
      <video id={DRAW_VIDEO_SLOT_ID} className="video-pool-slot" playsInline preload="auto" />
    </div>
  )
}
