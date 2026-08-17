import { extend } from '@pixi/react'
import { Graphics, Sprite, Text, TextStyle } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { useTranslation } from 'react-i18next'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useTexture } from '../hooks/useTexture'
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './layout.constants'
import { getCoverFit } from '../utils/scale'

extend({ Sprite, Graphics, Text })

const FALLBACK_LABEL_STYLE = new TextStyle({
  fontFamily: 'Arial',
  fontSize: 32,
  fill: 0xc9c9d1,
})

const ICON_WIDTH = 280
const ICON_HEIGHT = 200
const ICON_X = (DESIGN_WIDTH - ICON_WIDTH) / 2
const ICON_Y = (DESIGN_HEIGHT - ICON_HEIGHT) / 2 - 60

const OVERLAY_ALPHA = 0.7

function drawOverlay(g: PixiGraphics) {
  g.clear()
  g.setFillStyle({ color: 0x000000, alpha: OVERLAY_ALPHA })
  g.rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT)
  g.fill()
}

function drawMediaErrorFallback(g: PixiGraphics) {
  g.clear()

  g.setFillStyle({ color: 0x2b2b33 })
  g.rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT)
  g.fill()

  g.setStrokeStyle({ width: 6, color: 0x8a8a96 })
  g.roundRect(ICON_X, ICON_Y, ICON_WIDTH, ICON_HEIGHT, 10)
  g.stroke()

  g.setFillStyle({ color: 0x8a8a96 })
  g.circle(ICON_X + 55, ICON_Y + 55, 16)
  g.fill()

  g.setFillStyle({ color: 0x8a8a96 })
  g.poly([
    ICON_X + 20, ICON_Y + ICON_HEIGHT - 20,
    ICON_X + 90, ICON_Y + 40,
    ICON_X + 130, ICON_Y + 80,
    ICON_X + 190, ICON_Y + 10,
    ICON_X + 230, ICON_Y + ICON_HEIGHT - 20,
  ])
  g.fill()

  g.setStrokeStyle({ width: 8, color: 0xe05a4e })
  g.moveTo(ICON_X, ICON_Y)
  g.lineTo(ICON_X + ICON_WIDTH, ICON_Y + ICON_HEIGHT)
  g.stroke()
}

export function Background() {
  const { t } = useTranslation()
  const backgroundUrl = useGameConfigStore((state) => state.backgroundUrl)
  const { texture, failed } = useTexture(backgroundUrl)

  if (texture) {
    const { width, height, x, y } = getCoverFit(texture.width, texture.height, DESIGN_WIDTH, DESIGN_HEIGHT)
    return (
      <>
        <pixiSprite texture={texture} x={x} y={y} width={width} height={height} />
        <pixiGraphics draw={drawOverlay} />
      </>
    )
  }

  if (!failed) return null

  return (
    <>
      <pixiGraphics draw={drawMediaErrorFallback} />
      <pixiText
        text={t('media.imageNotAvailable')}
        style={FALLBACK_LABEL_STYLE}
        x={DESIGN_WIDTH / 2}
        y={ICON_Y + ICON_HEIGHT + 60}
        anchor={{ x: 0.5, y: 0.5 }}
      />
      <pixiGraphics draw={drawOverlay} />
    </>
  )
}
