import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { mockProfile, mockToken } from '@mocks/handlers'
import { server } from '@mocks/server'

import { ApiError, AUTH_ENDPOINTS, getProfile, login } from './authService'

describe('authService', () => {
  describe('with the default handlers', () => {
    it('logs in and returns the token and user', async () => {
      const result = await login({ email: 'lancelot@camelot.test', password: 'hunter2' })

      expect(result.token).toBe(mockToken)
      // The default handler echoes the submitted email, which proves the
      // credentials actually went out in the request body.
      expect(result.user).toEqual({
        id: mockProfile.id,
        username: mockProfile.username,
        email: 'lancelot@camelot.test',
      })
    })

    it('fetches the profile with a bearer token', async () => {
      await expect(getProfile(mockToken)).resolves.toEqual(mockProfile)
    })

    it('rejects with a 401 ApiError when the token is wrong', async () => {
      const error = await getProfile('stale-token').catch((e: unknown) => e)

      expect(error).toBeInstanceOf(ApiError)
      expect(error).toMatchObject({ status: 401, message: 'Unauthorized' })
    })
  })

  describe('with per-test server.use() overrides', () => {
    it('surfaces the server message when login is rejected', async () => {
      server.use(
        http.post(AUTH_ENDPOINTS.login, () =>
          HttpResponse.json({ message: 'Invalid email or password' }, { status: 401 }),
        ),
      )

      const error = await login({ email: 'mordred@camelot.test', password: 'wrong' }).catch(
        (e: unknown) => e,
      )

      expect(error).toBeInstanceOf(ApiError)
      expect(error).toMatchObject({ status: 401, message: 'Invalid email or password' })
    })

    it('falls back to a generic message when the error body is not JSON', async () => {
      server.use(
        http.get(AUTH_ENDPOINTS.profile, () =>
          new HttpResponse('<html>502 Bad Gateway</html>', {
            status: 502,
            headers: { 'Content-Type': 'text/html' },
          }),
        ),
      )

      const error = await getProfile(mockToken).catch((e: unknown) => e)

      expect(error).toBeInstanceOf(ApiError)
      expect(error).toMatchObject({ status: 502, message: 'Request failed with status 502' })
    })

    it('rejects with a network error, not an ApiError, when the request never completes', async () => {
      server.use(http.get(AUTH_ENDPOINTS.profile, () => HttpResponse.error()))

      const error = await getProfile(mockToken).catch((e: unknown) => e)

      expect(error).toBeInstanceOf(TypeError)
      expect(error).not.toBeInstanceOf(ApiError)
    })

    // Runs after the overrides above: if resetHandlers() were missing from
    // src/test/setup.ts, the 401 login override would still be active here.
    it('does not leak overrides into later tests', async () => {
      await expect(login({ email: 'arthur@camelot.test', password: 'x' })).resolves.toMatchObject({
        token: mockToken,
      })
    })
  })

  it('fails loudly on a request no handler matches', async () => {
    // MSW also logs the unmatched request; silence that expected noise.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Assert on MSW's own rejection, not just "it threw": under 'bypass' the
    // request would still reject - with a real-network `TypeError: fetch failed`.
    await expect(fetch('/api/not-mocked')).rejects.toThrow(/\[MSW\]/)

    consoleError.mockRestore()
  })
})
