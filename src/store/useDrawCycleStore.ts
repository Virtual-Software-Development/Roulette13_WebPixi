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
  // true recién cuando el <video> de resultado terminó de cargar Y de subir del todo a su posición
  // final (RouletteVideoView: `ready && arrived`) -- publicado acá para que los overlays
  // informativos (LiveTableBetsPanel, ResultStatsPanel, LeftStatsSidebar) esperen esto antes de
  // arrancar su propio fade-in, en vez de aparecer apenas `active` pasa a true.
  //
  // OJO -- no alcanza con esperar solo a que el video esté "cargado" (intento anterior, ver
  // historial): en la práctica el video YA está precargado para cuando `active` pasa a true
  // (App.tsx espera `videoReadyPromise` antes de activar la ronda), así que ese gate solo tapaba el
  // caso raro de una carga lenta y no el real: el slide-up del video (RouletteVideoView,
  // VIDEO_WHEEL_TRANSITION_DURATION_MS = 900ms) es DELIBERADAMENTE más lento que el fade-in de
  // estos paneles (TRANSITION_DURATION_MS = 550ms, ver layout.constants.ts) para que su movimiento
  // se perciba bien -- con el gate viejo, el panel arrancaba apenas el video terminaba de cargar
  // (casi al instante) y llegaba a mostrar el highlight/glow ~350-500ms antes de que el video
  // terminara de subir y arrancara a reproducirse. Esperar a `arrived` (progreso===1 del slide, no
  // solo `ready`) cierra ese hueco de verdad. La SALIDA de estos paneles sigue atada solo a
  // `active` (no a esto), así que dejan de verse en el mismo instante en que el video se retira.
  videoArrived: boolean
  setVideoArrived: (videoArrived: boolean) => void
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
  videoArrived: false,
  setVideoArrived: (videoArrived) => set({ videoArrived }),
  videoSlideProgress: 0,
  setVideoSlideProgress: (videoSlideProgress) => set({ videoSlideProgress }),
  winnerPanelNumber: null,
  setWinnerPanelNumber: (winnerPanelNumber) => set({ winnerPanelNumber }),
  winnerPanelExiting: false,
  setWinnerPanelExiting: (winnerPanelExiting) => set({ winnerPanelExiting }),
  lobbyInfoVisible: true,
  setLobbyInfoVisible: (lobbyInfoVisible) => set({ lobbyInfoVisible }),
}))
