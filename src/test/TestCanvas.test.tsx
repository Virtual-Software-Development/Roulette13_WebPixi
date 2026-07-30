import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { TestCanvas } from '../pixi/TestCanvas'

describe('TestCanvas', () => {
  it('mounts without throwing and renders a canvas element', () => {
    const { container } = render(<TestCanvas />)
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })
})
