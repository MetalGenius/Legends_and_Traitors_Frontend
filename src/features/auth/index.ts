/**
 * Public API of the `auth` feature.
 *
 * Everything other layers are allowed to import lives here. Anything not
 * exported from this file is private to the feature - deep imports such as
 * `@features/auth/components/Foo` are a convention violation.
 */
export { ApiError, AUTH_ENDPOINTS, createGuest, getProfile, login } from './api/authService'
export { useGuestSession } from './hooks/useGuestSession'
export type {
  ApiErrorBody,
  GuestResponse,
  GuestUser,
  LoginCredentials,
  LoginResponse,
  Profile,
  User,
} from './types/auth'
