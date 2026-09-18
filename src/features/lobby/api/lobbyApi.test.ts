import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { mockLobby } from '@mocks/handlers'
import { server } from '@mocks/server'

import { ApiError, createLobby, LOBBY_ENDPOINTS } from './lobbyApi'

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
