import type {
  ApiErrorBody,
  LobbyResponse,
  LobbyResponseWithGuest,
} from '@features/lobby/types/lobby'
import { authHeaders } from '@shared/lib/session'

export const LOBBY_ENDPOINTS = {
  create: '/api/lobby',
  detail: (code: string) => `/api/lobby/${code}`,
  join: (code: string) => `/api/lobby/${code}/join`,
} as const

/** A request that reached the server and came back with a non-2xx status. */
export class ApiError extends Error {
  readonly status: number
  /** The response body's `message`, if it had one - safe to show the user. */
  readonly serverMessage: string | null

  constructor(status: number, serverMessage: string | null) {
    super(serverMessage ?? `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.serverMessage = serverMessage
  }
}

async function readErrorMessage(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as ApiErrorBody
    if (typeof body.message === 'string' && body.message) return body.message
  } catch {
    // Not JSON - e.g. an HTML error page from a proxy. Fall through.
  }
  return null
}

/**
 * Throws a plain Error when the request never reached the server (offline,
 * DNS failure, CORS), and an ApiError carrying the status when it did but
 * came back non-2xx. Callers rely on that distinction for their messaging.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      // Identifies the player; absent until they've logged in or joined once.
      headers: { Accept: 'application/json', ...authHeaders(), ...init?.headers },
    })
  } catch {
    throw new Error('Network error: could not reach the server.')
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response))
  }

  return (await response.json()) as T
}

/**
 * No body needed - the host is whoever the token belongs to. Sent without a
 * token, the server creates a guest account for the host and returns it as
 * `guest`.
 */
export function createLobby(): Promise<LobbyResponseWithGuest> {
  return request<LobbyResponseWithGuest>(LOBBY_ENDPOINTS.create, { method: 'POST' })
}

/** Current state of an existing lobby. Throws a 404 ApiError if it's gone. */
export function getLobbyState(code: string): Promise<LobbyResponse> {
  return request<LobbyResponse>(LOBBY_ENDPOINTS.detail(code))
}

/**
 * Adds the current player to an existing lobby and returns its updated state.
 * Sent without a token, the server creates a guest account for the player and
 * returns it as `guest`. Throws an ApiError with 404 if the lobby is gone,
 * 409 if it's full, and 400 if its game has already started.
 */
export function joinLobby(code: string): Promise<LobbyResponseWithGuest> {
  return request<LobbyResponseWithGuest>(LOBBY_ENDPOINTS.join(code), { method: 'POST' })
}
