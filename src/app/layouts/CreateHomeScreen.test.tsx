import { act, fireEvent, render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { LOBBY_ENDPOINTS, useLobbyStore } from '@features/lobby'
import { server } from '@mocks/server'

import CreateHomeScreen from './CreateHomeScreen'

// The lobby store is a module-level singleton shared across tests - reset it
// so one test's created lobby can't leak into the next.
beforeEach(() => {
  useLobbyStore.getState().clearLobby()
})

function renderHome(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/', state }]}>
      <Routes>
        <Route path="/" element={<CreateHomeScreen />} />
        <Route path="/lobby/:code" element={<div>Lobby screen</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function getButton() {
  return screen.getByTestId('create-lobby-button') as HTMLButtonElement
}

describe('CreateHomeScreen', () => {
  it('navigates to the new lobby on success with no error shown', async () => {
    renderHome()

    await act(async () => {
      fireEvent.click(getButton())
    })

    expect(await screen.findByText('Lobby screen')).toBeDefined()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows an inline error and re-enables the button on failure', async () => {
    server.use(
      http.post(LOBBY_ENDPOINTS.create, () =>
        HttpResponse.json({ message: 'Server exploded' }, { status: 500 }),
      ),
    )
    renderHome()

    await act(async () => {
      fireEvent.click(getButton())
    })

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Server exploded')
    expect(getButton().disabled).toBe(false)
  })

  it('disables the button while the request is in flight', async () => {
    server.use(
      http.post(LOBBY_ENDPOINTS.create, async () => {
        await new Promise((resolve) => setTimeout(resolve, 20))
        return HttpResponse.json({ message: 'Server exploded' }, { status: 500 })
      }),
    )
    renderHome()

    fireEvent.click(getButton())

    expect(getButton().disabled).toBe(true)

    await screen.findByRole('alert')
    expect(getButton().disabled).toBe(false)
  })

  describe('when a bad lobby code bounced the user back here', () => {
    it('shows the message the redirect carried', () => {
      renderHome({ lobbyError: 'That lobby code is invalid or has expired.' })

      expect(screen.getByRole('alert').textContent).toBe(
        'That lobby code is invalid or has expired.',
      )
    })

    it('shows nothing when the user arrived normally', () => {
      renderHome()

      expect(screen.queryByRole('alert')).toBeNull()
    })
  })
})
