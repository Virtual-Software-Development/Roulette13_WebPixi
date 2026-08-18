import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Application } from '@pixi/react'
import { SharedLayout } from '../layout/SharedLayout'

describe('SharedLayout', () => {
  it('mounts without throwing and renders a canvas element', () => {
    const { container } = render(
      <Application>
        <SharedLayout>
          <pixiContainer />
        </SharedLayout>
      </Application>,
    )

    expect(container.querySelector('canvas')).toBeInTheDocument()
  })
})
