import { useCallback, useRef } from 'react'
import { extend } from '@pixi/react'
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { useTranslation } from 'react-i18next'
import { useResultsStore } from '../../store/useResultsStore'
import { useGameConfigStore } from '../../store/useGameConfigStore'
import { useCountdown } from '../../hooks/useCountdown'
import { DESIGN_WIDTH, TABLE_WIDTH_RATIO } from '../../layout/layout.constants'
import { drawRoundedPanel } from '../../utils/roundedPanel'
import { RouletteCountdownIndicator } from './RouletteCountdownIndicator'

extend({ Container, Graphics, Text })

// Alto del bloque "juego actual" -- GameList lo importa para saber dónde empieza su propio panel
// (sin gap: ambos fondos se tocan y se leen como una única tarjeta, ver su comentario) y para
// calcular el borde exterior de la tarjeta completa.
export const LAST_GAME_HEIGHT = 220

const PANEL_PADDING = 22
const PANEL_CORNER_RADIUS = 20
const PANEL_BG = 0x030c15

const DIVIDER_COLOR = 0x788793
const DIVIDER_ALPHA = 0.16

const INDICATOR_SIZE = 100

const LABEL_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontSize: 17,
  fontWeight: '600',
  letterSpacing: 0.5,
  fill: 0xa7a8ac,
})

const GAME_NUMBER_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontSize: 50,
  fontWeight: '600',
  fill: 0xf0f0f0,
})

const COUNTDOWN_STYLE_NORMAL = new TextStyle({
  fontFamily: 'Arial',
  fontSize: 36,
  fontWeight: '600',
  fill: 0xff171d,
})

const COUNTDOWN_STYLE_URGENT = new TextStyle({
  fontFamily: 'Arial',
  fontSize: 36,
  fontWeight: '600',
  fill: 0xff474c,
})

export function LastGame() {
  const { t } = useTranslation()
  const currentWinner = useResultsStore((state) => state.currentWinner)
  const nextDrawStartTime = useGameConfigStore((state) => state.nextDrawStartTime)
  const countdown = useCountdown(nextDrawStartTime)

  // No hay una duración total de ronda en el backend (solo el countdown hacia la próxima) -- se
  // infiere como el mayor remainingSeconds visto desde el último reset; en cuanto arranca una
  // ronda nueva el countdown vuelve a subir y el ref se realinea solo. El indicador se va
  // "llenando" (progress = 1 - remaining/total) a medida que se acerca la próxima ronda.
  const cycleTotalRef = useRef(countdown.remainingSeconds || 1)
  if (countdown.remainingSeconds > cycleTotalRef.current) {
    cycleTotalRef.current = countdown.remainingSeconds
  }
  const countdownProgress = cycleTotalRef.current > 0 ? 1 - countdown.remainingSeconds / cycleTotalRef.current : 0

  const tableWidth = DESIGN_WIDTH * TABLE_WIDTH_RATIO
  const tableX = (DESIGN_WIDTH - tableWidth) / 2

  const drawPanel = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      drawRoundedPanel(g, {
        width: tableWidth,
        height: LAST_GAME_HEIGHT,
        corners: { topLeft: PANEL_CORNER_RADIUS, topRight: PANEL_CORNER_RADIUS, bottomLeft: 0, bottomRight: 0 },
        fill: PANEL_BG,
      })
    },
    [tableWidth],
  )

  const drawDividers = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      // separador interno, entre el número de juego y el countdown
      g.rect(PANEL_PADDING, 116, tableWidth - PANEL_PADDING * 2, 1)
      g.fill({ color: DIVIDER_COLOR, alpha: DIVIDER_ALPHA })
      // separador de sección, ancho completo -- lo que sigue (GameList) empieza justo debajo
      g.rect(0, LAST_GAME_HEIGHT - 1, tableWidth, 1)
      g.fill({ color: DIVIDER_COLOR, alpha: DIVIDER_ALPHA })
    },
    [tableWidth],
  )

  if (!currentWinner) return null

  const countdownStyle = countdown.urgent ? COUNTDOWN_STYLE_URGENT : COUNTDOWN_STYLE_NORMAL

  return (
    <pixiContainer x={tableX} y={0}>
      <pixiGraphics draw={drawPanel} />
      <pixiGraphics draw={drawDividers} />

      <pixiText text={t('lastGame.currentGame')} style={LABEL_STYLE} x={PANEL_PADDING} y={PANEL_PADDING} />
      <pixiText text={currentWinner.drawNumber} style={GAME_NUMBER_STYLE} x={PANEL_PADDING} y={PANEL_PADDING + 24} />

      <pixiText text={t('lastGame.nextRoundIn')} style={LABEL_STYLE} x={PANEL_PADDING} y={132} />
      <pixiText text={countdown.display} style={countdownStyle} x={PANEL_PADDING} y={156} />

      <pixiContainer x={tableWidth - PANEL_PADDING - INDICATOR_SIZE} y={10}>
        <RouletteCountdownIndicator size={INDICATOR_SIZE} progress={countdownProgress} urgent={countdown.urgent} />
      </pixiContainer>
    </pixiContainer>
  )
}
