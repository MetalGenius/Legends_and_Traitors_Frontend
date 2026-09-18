import { http, HttpResponse } from 'msw'

import {
  AUTH_ENDPOINTS,
  type ApiErrorBody,
  type LoginCredentials,
  type LoginResponse,
  type Profile,
} from '@features/auth'
import { LOBBY_ENDPOINTS, type CreateLobbyResponse } from '@features/lobby'

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

export const mockLobby: CreateLobbyResponse['data'] = {
  lobbyCode: 'AB12CD',
  lobbyUrl: 'https://app.com/join/AB12CD',
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

  http.post<never, never, CreateLobbyResponse>(LOBBY_ENDPOINTS.create, () => {
    return HttpResponse.json({ status: 'SUCCESS', data: mockLobby })
  }),
]
