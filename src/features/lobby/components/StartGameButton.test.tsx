import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { LobbyPlayer } from '@features/lobby/types/lobby'
import {
  NEED_MORE_PLAYERS_HINT,
  WAITING_FOR_READY_HINT,
} from '@features/lobby/utils/startGame'

import StartGameButton from './StartGameButton'

function players(count: number, allReady = true): LobbyPlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    username: `Player ${i}`,
    isHost: i === 0,
    isReady: allReady,
  }))
}

describe('StartGameButton', () => {
  describe('when the game can start', () => {
    it('starts the game when clicked', () => {
      const onStart = vi.fn()
      render(<StartGameButton players={players(4)} onStart={onStart} />)

      fireEvent.click(screen.getByRole('button', { name: 'Start Game' }))

      expect(onStart).toHaveBeenCalledTimes(1)
    })

    it('shows no hint', () => {
      render(<StartGameButton players={players(4)} />)

      expect(screen.getByRole('button').getAttribute('aria-disabled')).toBe('false')
      expect(screen.queryByRole('tooltip')).toBeNull()
    })
  })

  describe("when it can't", () => {
    it('ignores clicks', () => {
      const onStart = vi.fn()
      render(<StartGameButton players={players(3)} onStart={onStart} />)

      fireEvent.click(screen.getByRole('button', { name: 'Start Game' }))

      expect(onStart).not.toHaveBeenCalled()
      expect(screen.getByRole('button').getAttribute('aria-disabled')).toBe('true')
    })

    // A real `disabled` would block the hover the hint needs.
    it('stays hoverable rather than truly disabled', () => {
      render(<StartGameButton players={players(3)} />)

      expect(screen.getByRole('button').hasAttribute('disabled')).toBe(false)
    })

    it.each([
      ['too few players', players(3), NEED_MORE_PLAYERS_HINT],
      ['someone not ready', players(4, false), WAITING_FOR_READY_HINT],
    ])('explains %s in a hint tied to the button', (_, lobbyPlayers, hint) => {
      render(<StartGameButton players={lobbyPlayers} />)

      const tooltip = screen.getByRole('tooltip')
      expect(tooltip.textContent).toBe(hint)
      // Screen readers announce it with the button; sighted users see it on
      // hover or keyboard focus.
      expect(screen.getByRole('button').getAttribute('aria-describedby')).toBe(tooltip.id)
      expect(tooltip.className).toContain('group-hover:opacity-100')
      expect(tooltip.className).toContain('group-focus-within:opacity-100')
    })
  })
})
