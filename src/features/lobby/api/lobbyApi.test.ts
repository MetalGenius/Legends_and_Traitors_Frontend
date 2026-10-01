import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import {
  mockFullLobby,
  mockGuest,
  mockGuestSession,
  mockGuestToken,
  mockHost,
  mockHostToken,
  mockJoinedLobby,
  mockLobby,
  mockProfile,
  mockToken,
} from '@mocks/handlers'
import { server } from '@mocks/server'
import { useSessionStore } from '@shared/lib/session'

import { ApiError, createLobby, getLobbyState, joinLobby, LOBBY_ENDPOINTS } from './lobbyApi'

describe('lobbyApi.createLobby', () => {
  it('returns the server data on success', async () => {
    const result = await createLobby()

    expect(result.status).toBe('SUCCESS')
    expect(result.data).toEqual(mockLobby)
  })

  it('returns the guest account it made for a host with no token', async () => {
    const result = await createLobby()

    expect(result.guest).toEqual({ token: mockHostToken, user: mockHost })
    expect(result.data.hostId).toBe(mockHost.id)
  })

  it('makes whoever the token belongs to the host, with no new guest', async () => {
    const { token, account } = mockGuestSession
    useSessionStore.getState().setSession(token, account)

    const result = await createLobby()

    expect(result.guest).toBeUndefined()
    expect(result.data.hostId).toBe(account.id)
    expect(result.data.players).toEqual([
      { id: account.id, username: account.displayName, isHost: true, isReady: false },
    ])
  })

  it('throws an ApiError with the server message on a 400', async () => {
    server.use(
      http.post(LOBBY_ENDPOINTS.create, () =>
        HttpResponse.json({ message: 'Invalid request' }, { status: 400 }),
      ),
    )

    const error = await createLobby().catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 400,
      message: 'Invalid request',
      serverMessage: 'Invalid request',
    })
  })

  it('has no serverMessage when the error body is not JSON', async () => {
    server.use(
      http.post(LOBBY_ENDPOINTS.create, () =>
        new HttpResponse('<html>502 Bad Gateway</html>', {
          status: 502,
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    )

    const error = await createLobby().catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 502,
      message: 'Request failed with status 502',
      serverMessage: null,
    })
  })

  it('throws an ApiError with the server message on a 500', async () => {
    server.use(
      http.post(LOBBY_ENDPOINTS.create, () =>
        HttpResponse.json({ message: 'Internal server error' }, { status: 500 }),
      ),
    )

    const error = await createLobby().catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 500, message: 'Internal server error' })
  })

  it('throws a plain Error (not ApiError) on a network failure', async () => {
    server.use(http.post(LOBBY_ENDPOINTS.create, () => HttpResponse.error()))

    const error = await createLobby().catch((e: unknown) => e)

    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(ApiError)
    expect((error as Error).message).toMatch(/network error/i)
  })
})

describe('lobbyApi.getLobbyState', () => {
  it('returns the lobby for a code that exists', async () => {
    const result = await getLobbyState(mockLobby.lobbyCode)

    expect(result.status).toBe('SUCCESS')
    expect(result.data).toEqual(mockLobby)
  })

  it('returns the full lobby too - only joining it is refused', async () => {
    const result = await getLobbyState(mockFullLobby.lobbyCode)

    expect(result.data).toEqual(mockFullLobby)
  })

  it('throws a 404 ApiError for a lobby that is gone or never existed', async () => {
    const error = await getLobbyState('ZZ99ZZ').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404 })
  })

  it('throws an ApiError with the server message on a 500', async () => {
    server.use(
      http.get(LOBBY_ENDPOINTS.detail(':code'), () =>
        HttpResponse.json({ message: 'Internal server error' }, { status: 500 }),
      ),
    )

    const error = await getLobbyState('AB12CD').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 500, message: 'Internal server error' })
  })

  it('throws a plain Error (not ApiError) on a network failure', async () => {
    server.use(http.get(LOBBY_ENDPOINTS.detail(':code'), () => HttpResponse.error()))

    const error = await getLobbyState('AB12CD').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(ApiError)
    expect((error as Error).message).toMatch(/network error/i)
  })

  it('requests the code it was given', async () => {
    let requestedUrl = ''
    server.use(
      http.get(LOBBY_ENDPOINTS.detail(':code'), ({ request }) => {
        requestedUrl = new URL(request.url).pathname
        return HttpResponse.json({ status: 'SUCCESS', data: mockLobby })
      }),
    )

    await getLobbyState('QQ11QQ')

    expect(requestedUrl).toBe('/api/lobby/QQ11QQ')
  })
})

describe('lobbyApi.joinLobby', () => {
  it('returns the lobby with the new player in it', async () => {
    const result = await joinLobby(mockLobby.lobbyCode)

    expect(result.status).toBe('SUCCESS')
    expect(result.data).toEqual(mockJoinedLobby)
  })

  it('returns the guest account it created when joining without a token', async () => {
    const result = await joinLobby(mockLobby.lobbyCode)

    expect(result.guest).toEqual({ token: mockGuestToken, user: mockGuest })
  })

  it('returns the lobby unchanged for someone already in it', async () => {
    useSessionStore.getState().setSession(mockHostToken, { ...mockHost, isGuest: true })

    const result = await joinLobby(mockLobby.lobbyCode)

    expect(result.data).toEqual(mockLobby)
  })

  it('returns no guest account when the player already has a token', async () => {
    const { token, account } = mockGuestSession
    useSessionStore.getState().setSession(token, account)

    const result = await joinLobby(mockLobby.lobbyCode)

    expect(result.guest).toBeUndefined()
    expect(result.data).toEqual(mockJoinedLobby)
  })

  it('throws a 404 ApiError for a lobby that is gone or never existed', async () => {
    const error = await joinLobby('ZZ99ZZ').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404 })
  })

  it('throws a 409 ApiError for a full lobby', async () => {
    const error = await joinLobby(mockFullLobby.lobbyCode).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 409, message: 'Lobby is full' })
  })

  it('throws a plain Error (not ApiError) on a network failure', async () => {
    server.use(http.post(LOBBY_ENDPOINTS.join(':code'), () => HttpResponse.error()))

    const error = await joinLobby('AB12CD').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(ApiError)
    expect((error as Error).message).toMatch(/network error/i)
  })

  it("adds whoever the token belongs to, by display name", async () => {
    const { id, username, displayName } = mockProfile
    useSessionStore.getState().setSession(mockToken, { id, username, displayName, isGuest: false })

    const result = await joinLobby(mockLobby.lobbyCode)

    expect(result.data.players.at(-1)).toEqual({
      id: mockProfile.id,
      username: mockProfile.displayName,
      isHost: false,
      isReady: false,
    })
  })

  it('throws a 401 ApiError for a token the server does not recognise', async () => {
    useSessionStore.getState().setSession('stale-token', mockGuestSession.account)

    const error = await joinLobby(mockLobby.lobbyCode).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 401 })
  })

  it('posts to the join endpoint for the code it was given', async () => {
    let requested = ''
    server.use(
      http.post(LOBBY_ENDPOINTS.join(':code'), ({ request }) => {
        requested = `${request.method} ${new URL(request.url).pathname}`
        return HttpResponse.json({ status: 'SUCCESS', data: mockLobby })
      }),
    )

    await joinLobby('QQ11QQ')

    expect(requested).toBe('POST /api/lobby/QQ11QQ/join')
  })
})

describe('lobby requests', () => {
  it("send the session's bearer token", async () => {
    const { token, account } = mockGuestSession
    useSessionStore.getState().setSession(token, account)
    let authorization: string | null = null
    server.use(
      http.get(LOBBY_ENDPOINTS.detail(':code'), ({ request }) => {
        authorization = request.headers.get('Authorization')
        return HttpResponse.json({ status: 'SUCCESS', data: mockLobby })
      }),
    )

    await getLobbyState(mockLobby.lobbyCode)

    expect(authorization).toBe(`Bearer ${mockGuestToken}`)
  })

  it('send no Authorization header without a session', async () => {
    let hasAuthorization = true
    server.use(
      http.post(LOBBY_ENDPOINTS.create, ({ request }) => {
        hasAuthorization = request.headers.has('Authorization')
        return HttpResponse.json({ status: 'SUCCESS', data: mockLobby })
      }),
    )

    await createLobby()

    expect(hasAuthorization).toBe(false)
  })
})
