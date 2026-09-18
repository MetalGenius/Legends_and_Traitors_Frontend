import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import PlayerListItem from './PlayerListItem'

describe('PlayerListItem', () => {
  it("renders the player's name", () => {
    render(<PlayerListItem name="Arthur" />)

    expect(screen.getByText('Arthur')).toBeDefined()
  })

  it('renders the uppercased first initial as the avatar', () => {
    render(<PlayerListItem name="arthur" />)

    expect(screen.getByText('A')).toBeDefined()
  })

  it('ignores leading whitespace when deriving the initial', () => {
    render(<PlayerListItem name="  lancelot" />)

    expect(screen.getByText('L')).toBeDefined()
  })

  describe('host crown', () => {
    it('shows the crown when isHost is true', () => {
      render(<PlayerListItem name="Arthur" isHost />)

      expect(screen.getByTestId('host-crown')).toBeDefined()
    })

    it('hides the crown by default', () => {
      render(<PlayerListItem name="Arthur" />)

      expect(screen.queryByTestId('host-crown')).toBeNull()
    })
  })

  describe('ready status', () => {
    it('shows "Not Ready" by default', () => {
      render(<PlayerListItem name="Arthur" />)

      expect(screen.getByTestId('player-ready-status').textContent).toBe('Not Ready')
    })

    it('shows "Not Ready" when isReady is false', () => {
      render(<PlayerListItem name="Arthur" isReady={false} />)

      expect(screen.getByTestId('player-ready-status').textContent).toBe('Not Ready')
    })

    it('shows "Ready" when isReady is true', () => {
      render(<PlayerListItem name="Arthur" isReady />)

      expect(screen.getByTestId('player-ready-status').textContent).toBe('Ready')
    })
  })
})
