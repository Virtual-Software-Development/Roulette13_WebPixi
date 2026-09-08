import { create } from 'zustand'

export interface PendingDrawResult {
  drawNo: string
  result: number
}

interface DrawCycleState {
  pendingResult: PendingDrawResult | null
  setPendingResult: (result: PendingDrawResult | null) => void
  // true mientras la secuencia de video está en curso (subiendo, reproduciendo,
  // congelado en el resultado, o bajando) — leído directamente por RouletteVideoSprite
  // y por los elementos de RouletteLobby que salen/vuelven de escena en simultáneo.
  active: boolean
  setActive: (active: boolean) => void
  // Progreso 0..1 ya-easeado de la subida/bajada del video (ver RouletteVideoView, que lo
  // escribe en cada tick de su propia animación) -- publicado acá porque LobbyBackgroundLayer
  // vive fuera del árbol de Pixi y no puede usar useAnimatedProgress (depende de useTick).
  // Permite que la rueda del lobby (modo imagen) suba en sync con el video en vez de quedar
  // estática detrás de él.
  videoSlideProgress: number
  setVideoSlideProgress: (videoSlideProgress: number) => void
  // No-null = el panel Winner debe estar montado (visible o en medio de su animación de salida) --
  // capturado por RouletteVideoView cuando al video le quedan WINNER_PANEL_LEAD_SECONDS, porque
  // pendingResult se limpia en el evento 'ended', mucho antes de que el panel deba desaparecer.
  winnerPanelNumber: number | null
  setWinnerPanelNumber: (winnerPanelNumber: number | null) => void
  // true = el panel Winner ya debe animar su escala a 0 -- se dispara recién cuando la rueda ya
  // volvió del todo (App.tsx: handleFullyExited), no cuando `active` pasa a false.
  winnerPanelExiting: boolean
  setWinnerPanelExiting: (winnerPanelExiting: boolean) => void
  // Reemplaza a `active` como target de Header/Footer/SharedLayout -- se pone en false junto con
  // `active=true` al arrancar la ronda (mismo instante, se ocultan igual que antes), pero solo
  // vuelve a true cuando el panel Winner termina de escalarse a 0 (WinnerPanel.tsx), no apenas
  // termina el hold. Gatea también useHotColdWindow (que además espera 5s extra desde acá).
  lobbyInfoVisible: boolean
  setLobbyInfoVisible: (lobbyInfoVisible: boolean) => void
}

export const useDrawCycleStore = create<DrawCycleState>((set) => ({
  pendingResult: null,
  setPendingResult: (pendingResult) => set({ pendingResult }),
  active: false,
  setActive: (active) => set({ active }),
  videoSlideProgress: 0,
  setVideoSlideProgress: (videoSlideProgress) => set({ videoSlideProgress }),
  winnerPanelNumber: null,
  setWinnerPanelNumber: (winnerPanelNumber) => set({ winnerPanelNumber }),
  winnerPanelExiting: false,
  setWinnerPanelExiting: (winnerPanelExiting) => set({ winnerPanelExiting }),
  lobbyInfoVisible: true,
  setLobbyInfoVisible: (lobbyInfoVisible) => set({ lobbyInfoVisible }),
}))
