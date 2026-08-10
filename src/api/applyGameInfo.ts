import i18n from '../i18n'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useResultsStore } from '../store/useResultsStore'
import { buildMediaUrl } from '../utils/media'
import { parseApiDateTime } from '../utils/time'
import type { GameInfoResponse } from '../types/gameInfo'

const LANGUAGE_MAP: Record<string, string> = { es: 'es', en: 'en-US' }

function formatTime(datetime: string): string {
  return parseApiDateTime(datetime).toLocaleTimeString(i18n.language, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function applyGameInfo(data: GameInfoResponse, options: { seedHistory: boolean }) {
  useGameConfigStore.getState().setGameConfig({
    gameName: data.gameName,
    logoUrl: buildMediaUrl(data.logo),
    backgroundUrl: buildMediaUrl(data.background),
    drawNumber: data.nextDraw.drawNo,
    nextDrawTime: formatTime(data.nextDraw.startTime),
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
        id: draw.drawNo,
        time: formatTime(draw.time),
        drawNumber: draw.drawNo,
        winningNumber: draw.result,
      }))
    )
  }

  i18n.changeLanguage(LANGUAGE_MAP[data.language] ?? data.language)
}
