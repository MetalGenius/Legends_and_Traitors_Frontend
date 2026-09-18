import type { ApiErrorBody, CreateLobbyResponse } from '@features/lobby/types/lobby'

export const LOBBY_ENDPOINTS = {
  create: '/api/lobby',
} as const

/** A request that reached the server and came back with a non-2xx status. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody
    if (typeof body.message === 'string' && body.message) return body.message
  } catch {
    // Not JSON - e.g. an HTML error page from a proxy. Fall through.
  }
  return `Request failed with status ${response.status}`
}

/** No body needed - host identity comes from the auth/guest token. */
export async function createLobby(): Promise<CreateLobbyResponse> {
  let response: Response
  try {
    response = await fetch(LOBBY_ENDPOINTS.create, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    })
  } catch {
    // fetch() itself threw - the request never reached the server (offline,
    // DNS failure, CORS, etc). Distinct from a server response we didn't like.
    throw new Error('Network error: could not reach the server.')
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response))
  }

  return (await response.json()) as CreateLobbyResponse
}
