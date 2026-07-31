import { extend } from '@pixi/react'
import { Sprite } from 'pixi.js'
import { useGameConfigStore } from '../store/useGameConfigStore'
import { useTexture } from '../hooks/useTexture'
import { useScreenSize } from '../hooks/useScreenSize'

extend({ Sprite })

export function Background() {
  const backgroundUrl = useGameConfigStore((state) => state.backgroundUrl)
  const texture = useTexture(backgroundUrl)
  const { width, height } = useScreenSize()

  if (!texture) return null

  return <pixiSprite texture={texture} width={width} height={height} />
}
