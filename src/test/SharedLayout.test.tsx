import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { SharedLayout } from '../layout/SharedLayout'

describe('SharedLayout', () => {
  it('mounts without throwing and renders a canvas element', () => {
    const { container } = render(
      <SharedLayout>
        <pixiContainer />
      </SharedLayout>,
    )

    expect(container.querySelector('canvas')).toBeInTheDocument()
  })
})
