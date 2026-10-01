import { http, HttpResponse } from 'msw'

import {
  AUTH_ENDPOINTS,
  type ApiErrorBody,
  type LoginCredentials,
  type LoginResponse,
  type Profile,
} from '@features/auth'
import { LOBBY_ENDPOINTS, type LobbyResponse } from '@features/lobby'

// Default (happy-path) handlers shared by every test. A test that needs a
// failure overrides one with `server.use()`; the override is reset after each
// test in src/test/setup.ts.

export const mockToken = 'mock-token'

export const mockProfile: Profile = {
  id: 'user-1',
  username: 'arthur',
  email: 'arthur@camelot.test',
  displayName: 'Arthur Pendragon',
  avatarUrl: null,
}

export const mockLobby: LobbyResponse['data'] = {
  lobbyCode: 'AB12CD',
  hostId: 'host-1',
  maxPlayers: 8,
  players: [{ id: 'host-1', name: 'HostName', isHost: true, isReady: false }],
}

/** mockLobby after a second (non-host) player has joined it. */
export const mockJoinedLobby: LobbyResponse['data'] = {
  ...mockLobby,
  players: [
    ...mockLobby.players,
    { id: 'player-2', name: 'Guinevere', isHost: false, isReady: false },
  ],
}

/** A lobby with every seat taken - joining it returns a 409. */
export const mockFullLobby: LobbyResponse['data'] = {
  lobbyCode: 'FULL01',
  hostId: 'full-host',
  maxPlayers: 4,
  players: [
    { id: 'full-host', name: 'Lancelot', isHost: true, isReady: true },
    { id: 'full-2', name: 'Gawain', isHost: false, isReady: true },
    { id: 'full-3', name: 'Percival', isHost: false, isReady: false },
    { id: 'full-4', name: 'Galahad', isHost: false, isReady: true },
  ],
}

const mockLobbies = [mockLobby, mockFullLobby]

function findMockLobby(code: string) {
  return mockLobbies.find((lobby) => lobby.lobbyCode === code)
}

export const handlers = [
  http.post<never, LoginCredentials, LoginResponse>(
    AUTH_ENDPOINTS.login,
    async ({ request }) => {
      const { email } = await request.json()
      const { id, username } = mockProfile
      return HttpResponse.json({ token: mockToken, user: { id, username, email } })
    },
  ),

  http.get<never, never, Profile | ApiErrorBody>(
    AUTH_ENDPOINTS.profile,
    ({ request }) => {
      if (request.headers.get('Authorization') !== `Bearer ${mockToken}`) {
        return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
      }
      return HttpResponse.json(mockProfile)
    },
  ),

  http.post<never, never, LobbyResponse>(LOBBY_ENDPOINTS.create, () => {
    return HttpResponse.json({ status: 'SUCCESS', data: mockLobby })
  }),

  // Only the mock lobbies exist; any other code behaves like an expired one.
  http.get<{ code: string }, never, LobbyResponse | ApiErrorBody>(
    LOBBY_ENDPOINTS.detail(':code'),
    ({ params }) => {
      const lobby = findMockLobby(params.code)
      if (!lobby) {
        return HttpResponse.json({ message: 'Lobby not found' }, { status: 404 })
      }
      return HttpResponse.json({ status: 'SUCCESS', data: lobby })
    },
  ),

  // AB12CD can be joined; FULL01 has no free seat; anything else is gone.
  http.post<{ code: string }, never, LobbyResponse | ApiErrorBody>(
    LOBBY_ENDPOINTS.join(':code'),
    ({ params }) => {
      const lobby = findMockLobby(params.code)
      if (!lobby) {
        return HttpResponse.json({ message: 'Lobby not found' }, { status: 404 })
      }
      if (lobby.players.length >= lobby.maxPlayers) {
        return HttpResponse.json({ message: 'Lobby is full' }, { status: 409 })
      }
      return HttpResponse.json({ status: 'SUCCESS', data: mockJoinedLobby })
    },
  ),
]
