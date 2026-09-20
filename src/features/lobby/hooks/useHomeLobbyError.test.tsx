import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { useHomeLobbyError } from './useHomeLobbyError'

function wrapperWithState(state: unknown) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[{ pathname: '/', state }]}>{children}</MemoryRouter>
    )
  }
}

describe('useHomeLobbyError', () => {
  it('returns the message a redirect left behind', () => {
    const { result } = renderHook(() => useHomeLobbyError(), {
      wrapper: wrapperWithState({ lobbyError: 'That lobby code is invalid.' }),
    })

    expect(result.current).toBe('That lobby code is invalid.')
  })

  it('returns null when the user arrived normally', () => {
    const { result } = renderHook(() => useHomeLobbyError(), {
      wrapper: wrapperWithState(undefined),
    })

    expect(result.current).toBeNull()
  })

  it('ignores router state that carries no lobbyError', () => {
    const { result } = renderHook(() => useHomeLobbyError(), {
      wrapper: wrapperWithState({ somethingElse: true }),
    })

    expect(result.current).toBeNull()
  })

  // Router state is arbitrary data from history - don't render a non-string.
  it('ignores a non-string lobbyError', () => {
    const { result } = renderHook(() => useHomeLobbyError(), {
      wrapper: wrapperWithState({ lobbyError: { nope: true } }),
    })

    expect(result.current).toBeNull()
  })
})
