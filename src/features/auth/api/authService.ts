import type {
  ApiErrorBody,
  LoginCredentials,
  LoginResponse,
  Profile,
} from '@features/auth/types/auth'

export const AUTH_ENDPOINTS = {
  login: '/api/auth/login',
  profile: '/api/auth/profile',
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
    const body = (await response.json()) as Partial<ApiErrorBody>
    if (typeof body.message === 'string' && body.message) return body.message
  } catch {
    // Not JSON - e.g. an HTML error page from a proxy. Fall through.
  }
  return `Request failed with status ${response.status}`
}

async function request<T>(
  path: string,
  init: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (init.body !== undefined) headers['Content-Type'] = 'application/json'
  if (init.token) headers.Authorization = `Bearer ${init.token}`

  const response = await fetch(path, {
    method: init.method ?? 'GET',
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response))
  }
  return (await response.json()) as T
}

export function login(credentials: LoginCredentials): Promise<LoginResponse> {
  return request<LoginResponse>(AUTH_ENDPOINTS.login, {
    method: 'POST',
    body: credentials,
  })
}

export function getProfile(token: string): Promise<Profile> {
  return request<Profile>(AUTH_ENDPOINTS.profile, { token })
}
