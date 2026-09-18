import { act, renderHook, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { useJoinLobby } from './useJoinLobby'

/** Renders whatever code the /lobby/:code route was navigated to with. */
function LobbyProbe() {
  const { code } = useParams<{ code?: string }>()
  return <div data-testid="lobby-probe">{code}</div>
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={children} />
        <Route path="/lobby/:code" element={<LobbyProbe />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('useJoinLobby', () => {
  it('navigates to the lobby for the given code', () => {
    const { result } = renderHook(() => useJoinLobby(), { wrapper })

    act(() => {
      result.current.joinLobby('AB12CD')
    })

    expect(screen.getByTestId('lobby-probe').textContent).toBe('AB12CD')
  })

  // Sanitizing/validating the code is JoinLobbyInput's job (and #41's for the
  // API check) - this hook passes through whatever it is handed.
  it('passes the code through untouched', () => {
    const { result } = renderHook(() => useJoinLobby(), { wrapper })

    act(() => {
      result.current.joinLobby('ab12cd')
    })

    expect(screen.getByTestId('lobby-probe').textContent).toBe('ab12cd')
  })
})
