// PROVISIONAL CONTRACT - the backend has not published auth/profile endpoints
// yet. These shapes are a placeholder so the service and its MSW handlers have
// something real to agree on. When the backend defines the API, update this
// file first: the service and src/mocks/handlers.ts both type-check against it.

export interface User {
  id: string
  username: string
  email: string
}

export interface Profile extends User {
  displayName: string
  avatarUrl: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

/** Body the API returns alongside a non-2xx status. */
export interface ApiErrorBody {
  message: string
}
