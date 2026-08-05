import { extend } from '@pixi/react'
import { Sprite } from 'pixi.js'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useTexture } from '../hooks/useTexture'
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './layout.constants'
import { getCoverFit } from '../utils/scale'

extend({ Sprite })

export function Background() {
  const backgroundUrl = useGameConfigStore((state) => state.backgroundUrl)
  const texture = useTexture(backgroundUrl)

  if (!texture) return null

  const { width, height, x, y } = getCoverFit(texture.width, texture.height, DESIGN_WIDTH, DESIGN_HEIGHT)

  return <pixiSprite texture={texture} x={x} y={y} width={width} height={height} />
}
