import i18n from '../i18n'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useResultsStore } from '../store/useResultsStore'
import { buildMediaUrlOrEmpty } from '../utils/media'
import { parseApiDateTime } from '../utils/time'
import type { GameInfoResponse } from '../types/gameInfo'

const LANGUAGE_MAP: Record<string, string> = { es: 'es', en: 'en-US' }

export function applyGameInfo(data: GameInfoResponse, options: { seedHistory: boolean }) {
  useGameConfigStore.getState().setGameConfig({
    gameName: data.gameName,
    logoUrl: buildMediaUrlOrEmpty(data.logo),
    backgroundUrl: buildMediaUrlOrEmpty(data.background),
    drawNumber: data.nextDraw.drawNo,
    nextDrawStartTime: data.nextDraw.startTime,
  })

  const resultsStore = useResultsStore.getState()
  resultsStore.setMaxResults(data.historyMax)

  // El historial solo se puebla desde /gameInfo una vez, al cargar la app.
  // De ahí en más crece exclusivamente con resultados reales confirmados por
  // /drawResult (vía addResult) — si se volviera a llamar hydrateHistory en
  // cada ciclo, el `history` de /gameInfo pisaría el resultado real recién
  // agregado con lo que sea que la API devuelva en ese momento.
  if (options.seedHistory) {
    resultsStore.hydrateHistory(
      data.history.map((draw) => ({
        // drawNo alone isn't a safe id/React key: the backend explicitly resets it every
        // calendar day ("numero_evento repeats daily", internal/events/repository.go), so two
        // entries from different days can share the same drawNo. `time` (this entry's own
        // timestamp) disambiguates that; `drawNumber` below is unaffected and still shows the
        // plain per-day number, which is the correct display value.
        id: `${draw.time}-${draw.drawNo}`,
        timestamp: parseApiDateTime(draw.time).getTime(),
        drawNumber: draw.drawNo,
        winningNumber: draw.result,
      }))
    )
  }

  i18n.changeLanguage(LANGUAGE_MAP[data.language] ?? data.language)
}
