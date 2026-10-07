import { useState } from 'react'
import { VideoErrorPanel, type VideoErrorPanelEmphasis, type VideoErrorResult } from './VideoErrorPanel'
import { WINNER_PANEL_EXIT_DURATION_MS, WINNER_PANEL_LEAD_SECONDS } from '../layout/layout.constants'

// Preview temporal (?preview=video-error-panel) para maquetar VideoErrorPanel sin tener que
// provocar que el video del sorteo falle de verdad. Monta solo el panel, con una barra de controles
// encima para probar sus estados (juego/resultado, duración del video, énfasis, salida).
const EMPHASIS_OPTIONS: Array<VideoErrorPanelEmphasis | 'auto'> = ['auto', 'normal', 'attention', 'muted']
type ResultMode = 'roulette' | 'quickMoney' | 'none'

// Valores iniciales opcionales por URL (?result=roulette|quickMoney|none&n=0..37&duration=18) --
// para abrir directo un caso concreto.
const QUERY = new URLSearchParams(window.location.search)
const INITIAL_MODE: ResultMode = (['roulette', 'quickMoney', 'none'] as const).find((mode) => mode === QUERY.get('result')) ?? 'roulette'
const INITIAL_NUMBER = Number(QUERY.get('n') ?? 23)
const INITIAL_DURATION_SECONDS = Number(QUERY.get('duration') ?? 18)

function isoInSeconds(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString()
}

// Mismos instantes que usan VideoErrorRound (Roulette: revela WINNER_PANEL_LEAD_SECONDS antes del
// final) y QuickMoneyVideoView (revela al final).
function buildTimeline(mode: ResultMode, durationSeconds: number) {
  const revealLeadSeconds = mode === 'quickMoney' ? 0 : WINNER_PANEL_LEAD_SECONDS
  return {
    revealAtIso: isoInSeconds(Math.max(0, durationSeconds - revealLeadSeconds)),
    continueAtIso: isoInSeconds(durationSeconds),
  }
}

function randomDigits(count: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 10))
}

function buildResult(mode: ResultMode, rouletteNumber: number): VideoErrorResult | null {
  if (mode === 'roulette') return { game: 'roulette', number: rouletteNumber }
  if (mode === 'quickMoney') return { game: 'quickMoney', pick3: randomDigits(3), pick4: randomDigits(4) }
  return null
}

export function VideoErrorPanelPreview() {
  const [durationSeconds, setDurationSeconds] = useState(INITIAL_DURATION_SECONDS)
  const [timeline, setTimeline] = useState(() => buildTimeline(INITIAL_MODE, INITIAL_DURATION_SECONDS))
  const [resultMode, setResultMode] = useState<ResultMode>(INITIAL_MODE)
  // 37 = '00' (ver toWheelPocket).
  const [rouletteNumber, setRouletteNumber] = useState(INITIAL_NUMBER)
  const [result, setResult] = useState<VideoErrorResult | null>(() => buildResult(INITIAL_MODE, INITIAL_NUMBER))
  const [emphasis, setEmphasis] = useState<VideoErrorPanelEmphasis | 'auto'>('auto')
  const [exiting, setExiting] = useState(false)
  // Cambiar la key remonta el panel -- vuelve a mostrarlo después de una salida.
  const [panelKey, setPanelKey] = useState(0)

  function applyResult(mode: ResultMode, number: number) {
    if (mode !== resultMode) setTimeline(buildTimeline(mode, durationSeconds))
    setResultMode(mode)
    setRouletteNumber(number)
    setResult(buildResult(mode, number))
  }

  function playExit() {
    setExiting(true)
    setTimeout(() => {
      setExiting(false)
      setPanelKey((key) => key + 1)
    }, WINNER_PANEL_EXIT_DURATION_MS + 600)
  }

  return (
    <>
      <VideoErrorPanel
        key={panelKey}
        result={result}
        revealAtIso={timeline.revealAtIso}
        continueAtIso={timeline.continueAtIso}
        exiting={exiting}
        backdrop={resultMode === 'quickMoney' ? 'plain' : 'wheel'}
        emphasis={emphasis === 'auto' ? undefined : emphasis}
      />
      <div
        style={{
          position: 'fixed',
          top: 12,
          left: 12,
          zIndex: 100,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          maxWidth: 'calc(100vw - 24px)',
          padding: '8px 12px',
          borderRadius: 8,
          background: 'rgba(0, 0, 0, 0.7)',
          color: '#fff',
          font: '13px sans-serif',
        }}
      >
        <label>
          Resultado{' '}
          <select value={resultMode} onChange={(event) => applyResult(event.target.value as ResultMode, rouletteNumber)}>
            <option value="roulette">Roulette</option>
            <option value="quickMoney">Quick Money</option>
            <option value="none">Sin resultado</option>
          </select>
        </label>
        {resultMode === 'roulette' && (
          <label>
            N° (37=00){' '}
            <input
              type="number"
              min={0}
              max={37}
              value={rouletteNumber}
              onChange={(event) => applyResult('roulette', Number(event.target.value))}
              style={{ width: 52 }}
            />
          </label>
        )}
        {resultMode === 'quickMoney' && <button onClick={() => applyResult('quickMoney', rouletteNumber)}>Otros dígitos</button>}
        <label>
          Duración video (s){' '}
          <input
            type="number"
            min={0}
            value={durationSeconds}
            onChange={(event) => setDurationSeconds(Number(event.target.value))}
            style={{ width: 56 }}
          />
        </label>
        <button onClick={() => setTimeline(buildTimeline(resultMode, durationSeconds))}>Reiniciar countdown</button>
        <label>
          Énfasis{' '}
          <select value={emphasis} onChange={(event) => setEmphasis(event.target.value as VideoErrorPanelEmphasis | 'auto')}>
            {EMPHASIS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <button onClick={playExit} disabled={exiting}>
          Animar salida
        </button>
      </div>
    </>
  )
}
