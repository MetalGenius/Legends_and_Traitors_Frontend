import { http, HttpResponse } from 'msw'

import {
  AUTH_ENDPOINTS,
  type ApiErrorBody,
  type LoginCredentials,
  type LoginResponse,
  type Profile,
} from '@features/auth'
import {
  LOBBY_ENDPOINTS,
  type GuestAccount,
  type LobbyPlayer,
  type LobbyResponse,
  type LobbyResponseWithGuest,
} from '@features/lobby'
import type { SessionAccount } from '@shared/lib/session'

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

export const mockGuestToken = 'mock-guest-token'

/** The guest account a join without a token creates. */
export const mockGuest: GuestAccount['user'] = {
  id: 'guest-92117',
  username: 'guest_92117',
  displayName: 'Guest92117',
}

/** mockGuest as the app stores it after that first join. */
export const mockGuestSession: { token: string; account: SessionAccount } = {
  token: mockGuestToken,
  account: { ...mockGuest, isGuest: true },
}

export const mockHostToken = 'mock-host-token'

/** The guest account a create without a token makes for the host. */
export const mockHost: GuestAccount['user'] = {
  id: 'host-1',
  username: 'host_1',
  displayName: 'HostName',
}

/** mockHost as the app stores it after creating mockLobby. */
export const mockHostSession: { token: string; account: SessionAccount } = {
  token: mockHostToken,
  account: { ...mockHost, isGuest: true },
}

/** The account a request's bearer token belongs to, or null if unknown. */
function accountFromToken(auth: string) {
  if (auth === `Bearer ${mockGuestToken}`) return mockGuest
  if (auth === `Bearer ${mockHostToken}`) return mockHost
  if (auth === `Bearer ${mockToken}`) return mockProfile
  return null
}

/** The lobby shows players by display name, never their username handle. */
function asPlayer(account: { id: string; displayName: string }): LobbyPlayer {
  return { id: account.id, username: account.displayName, isHost: false, isReady: false }
}

export const mockLobby: LobbyResponse['data'] = {
  lobbyCode: 'AB12CD',
  hostId: mockHost.id,
  maxPlayers: 8,
  players: [
    { ...asPlayer(mockHost), isHost: true },
    // Already ready, so the lobby shows both states before anyone toggles.
    { id: 'player-2', username: 'Guinevere', isHost: false, isReady: true },
  ],
}

/** mockLobby after the mock guest has joined it. */
export const mockJoinedLobby: LobbyResponse['data'] = {
  ...mockLobby,
  players: [
    ...mockLobby.players,
    { id: mockGuest.id, username: mockGuest.displayName, isHost: false, isReady: false },
  ],
}

/** A lobby with every seat taken - joining it returns a 409. */
export const mockFullLobby: LobbyResponse['data'] = {
  lobbyCode: 'FULL01',
  hostId: 'full-host',
  maxPlayers: 4,
  players: [
    { id: 'full-host', username: 'Lancelot', isHost: true, isReady: true },
    { id: 'full-2', username: 'Gawain', isHost: false, isReady: true },
    { id: 'full-3', username: 'Percival', isHost: false, isReady: false },
    { id: 'full-4', username: 'Galahad', isHost: false, isReady: true },
  ],
}

// The mock server's live state, so a join or a ready toggle sticks (and a
// later GET sees it) like a real backend. Starts from copies of the fixtures
// above, which stay untouched for tests to compare against.
const lobbies = new Map<string, LobbyResponse['data']>()

/** Puts every mock lobby back to its fixture. Runs after each test. */
export function resetMockLobbies() {
  lobbies.clear()
  for (const lobby of [mockLobby, mockFullLobby]) {
    lobbies.set(lobby.lobbyCode, structuredClone(lobby))
  }
}
resetMockLobbies()

function findMockLobby(code: string) {
  return lobbies.get(code)
}

function saveMockLobby(lobby: LobbyResponse['data']) {
  lobbies.set(lobby.lobbyCode, lobby)
  return lobby
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

  // The host is whoever the token belongs to. With no token, the server
  // creates a guest account for the host and hands it back with the lobby.
  http.post<never, never, LobbyResponseWithGuest | ApiErrorBody>(
    LOBBY_ENDPOINTS.create,
    ({ request }) => {
      const auth = request.headers.get('Authorization')
      if (!auth) {
        return HttpResponse.json({
          status: 'SUCCESS',
          data: saveMockLobby(structuredClone(mockLobby)),
          guest: { token: mockHostToken, user: mockHost },
        })
      }
      const account = accountFromToken(auth)
      if (!account) {
        return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
      }
      return HttpResponse.json({
        status: 'SUCCESS',
        data: saveMockLobby({
          ...mockLobby,
          hostId: account.id,
          players: [{ ...asPlayer(account), isHost: true }],
        }),
      })
    },
  ),

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
  // The joiner is whoever the bearer token belongs to. With no token at all,
  // the server creates a guest account and hands it back alongside the lobby.
  http.post<{ code: string }, never, LobbyResponseWithGuest | ApiErrorBody>(
    LOBBY_ENDPOINTS.join(':code'),
    ({ params, request }) => {
      const auth = request.headers.get('Authorization')
      const account = auth ? accountFromToken(auth) : mockGuest
      if (!account) {
        return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
      }
      const lobby = findMockLobby(params.code)
      if (!lobby) {
        return HttpResponse.json({ message: 'Lobby not found' }, { status: 404 })
      }
      // Already a player: nothing to add (and a full lobby doesn't apply).
      if (lobby.players.some((player) => player.id === account.id)) {
        return HttpResponse.json({ status: 'SUCCESS', data: lobby })
      }
      if (lobby.players.length >= lobby.maxPlayers) {
        return HttpResponse.json({ message: 'Lobby is full' }, { status: 409 })
      }
      return HttpResponse.json({
        status: 'SUCCESS',
        data: saveMockLobby({ ...lobby, players: [...lobby.players, asPlayer(account)] }),
        ...(auth ? {} : { guest: { token: mockGuestToken, user: mockGuest } }),
      })
    },
  ),

  // Only a player in the lobby can set their own ready flag.
  http.patch<{ code: string }, { isReady: boolean }, LobbyResponse | ApiErrorBody>(
    LOBBY_ENDPOINTS.ready(':code'),
    async ({ params, request }) => {
      const auth = request.headers.get('Authorization')
      const account = auth ? accountFromToken(auth) : null
      if (!account) {
        return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
      }
      const lobby = findMockLobby(params.code)
      if (!lobby) {
        return HttpResponse.json({ message: 'Lobby not found' }, { status: 404 })
      }
      if (!lobby.players.some((player) => player.id === account.id)) {
        return HttpResponse.json(
          { message: "You're not a player in this lobby" },
          { status: 403 },
        )
      }
      const { isReady } = await request.json()
      return HttpResponse.json({
        status: 'SUCCESS',
        data: saveMockLobby({
          ...lobby,
          players: lobby.players.map((player) =>
            player.id === account.id ? { ...player, isReady } : player,
          ),
        }),
      })
    },
  ),
]
