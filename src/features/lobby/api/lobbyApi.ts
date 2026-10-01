import type { ApiErrorBody, LobbyResponse } from '@features/lobby/types/lobby'
import { getAuthHeaders } from '@shared/lib/session'

export const LOBBY_ENDPOINTS = {
  create: '/api/lobby',
  detail: (code: string) => `/api/lobby/${code}`,
  join: (code: string) => `/api/lobby/${code}/join`,
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

/**
 * Throws a plain Error when the request never reached the server (offline,
 * DNS failure, CORS), and an ApiError carrying the status when it did but
 * came back non-2xx. Callers rely on that distinction for their messaging.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // The server identifies the player from this token (a guest one if they
  // haven't logged in), so it's sent on every lobby call.
  const authHeaders = await getAuthHeaders()
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      headers: { Accept: 'application/json', ...authHeaders, ...init?.headers },
    })
  } catch {
    throw new Error('Network error: could not reach the server.')
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response))
  }

  return (await response.json()) as T
}

/** No body needed - host identity comes from the auth/guest token. */
export function createLobby(): Promise<LobbyResponse> {
  return request<LobbyResponse>(LOBBY_ENDPOINTS.create, { method: 'POST' })
}

/** Current state of an existing lobby. Throws a 404 ApiError if it's gone. */
export function getLobbyState(code: string): Promise<LobbyResponse> {
  return request<LobbyResponse>(LOBBY_ENDPOINTS.detail(code))
}

/**
 * Adds the current user to an existing lobby and returns its updated state.
 * Throws an ApiError with 404 if the lobby is gone, 409 if it's full, and
 * 400 if its game has already started.
 */
export function joinLobby(code: string): Promise<LobbyResponse> {
  return request<LobbyResponse>(LOBBY_ENDPOINTS.join(code), { method: 'POST' })
}
