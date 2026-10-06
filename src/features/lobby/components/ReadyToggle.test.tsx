import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import ReadyToggle from './ReadyToggle'

describe('ReadyToggle', () => {
  it('says "Ready" when ready', () => {
    render(<ReadyToggle isReady />)

    expect(screen.getByTestId('player-ready-status').textContent).toBe('Ready')
  })

  it('says "Not Ready" when not ready', () => {
    render(<ReadyToggle isReady={false} />)

    expect(screen.getByTestId('player-ready-status').textContent).toBe('Not Ready')
  })

  // The card around it is the control, never the label itself.
  it('is not a control', () => {
    render(<ReadyToggle isReady />)

    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('switch')).toBeNull()
  })

  it('dims while a change is being saved', () => {
    render(<ReadyToggle isReady isSaving />)

    expect(screen.getByTestId('player-ready-status').className).toContain('opacity-60')
  })
})
