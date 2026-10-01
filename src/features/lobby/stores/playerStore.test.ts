import { beforeEach, describe, expect, it } from 'vitest'

import { usePlayerStore } from './playerStore'

// Module-level singleton shared across tests - reset it each time.
beforeEach(() => {
  usePlayerStore.getState().clearPlayer()
})

describe('playerStore', () => {
  it('starts with no display name', () => {
    expect(usePlayerStore.getState().displayName).toBeNull()
  })

  it('stores and clears the display name', () => {
    usePlayerStore.getState().setDisplayName('Guest92117')
    expect(usePlayerStore.getState().displayName).toBe('Guest92117')

    usePlayerStore.getState().clearPlayer()
    expect(usePlayerStore.getState().displayName).toBeNull()
  })
})
