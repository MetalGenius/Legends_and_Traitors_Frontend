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

  // Only the mock lobby exists; any other code behaves like an expired one.
  http.get<{ code: string }, never, LobbyResponse | ApiErrorBody>(
    LOBBY_ENDPOINTS.detail(':code'),
    ({ params }) => {
      if (params.code !== mockLobby.lobbyCode) {
        return HttpResponse.json({ message: 'Lobby not found' }, { status: 404 })
      }
      return HttpResponse.json({ status: 'SUCCESS', data: mockLobby })
    },
  ),
]
