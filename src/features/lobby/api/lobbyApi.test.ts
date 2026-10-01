import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { mockFullLobby, mockJoinedLobby, mockLobby } from '@mocks/handlers'
import { server } from '@mocks/server'

import { ApiError, createLobby, getLobbyState, joinLobby, LOBBY_ENDPOINTS } from './lobbyApi'

describe('lobbyApi.createLobby', () => {
  it('returns the server data on success', async () => {
    const result = await createLobby()

    expect(result.status).toBe('SUCCESS')
    expect(result.data).toEqual(mockLobby)
  })

  it('throws an ApiError with the server message on a 400', async () => {
    server.use(
      http.post(LOBBY_ENDPOINTS.create, () =>
        HttpResponse.json({ message: 'Invalid request' }, { status: 400 }),
      ),
    )

    const error = await createLobby().catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 400, message: 'Invalid request' })
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
