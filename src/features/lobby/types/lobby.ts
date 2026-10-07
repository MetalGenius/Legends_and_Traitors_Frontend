// PROVISIONAL CONTRACT - confirm the exact path and shape with Backend.
// The service and src/mocks/handlers.ts both type-check against this file;
// update it first when the real API is published.

export interface LobbyPlayer {
  /** The account id - matches SessionAccount.id for the current player. */
  id: string
  /** What the lobby shows for this player (the account's display name). */
  username: string
  isHost: boolean
  isReady: boolean
}

export interface LobbyData {
  lobbyCode: string
  hostId: string
  // No maxPlayers: every lobby has the same size, MAX_PLAYERS in
  // src/shared/config/game.ts.
  players: LobbyPlayer[]
}

/** Envelope shared by both create (POST) and fetch (GET) lobby responses. */
export interface LobbyResponse {
  status: string
  data: LobbyData
}

/** Account the server mints for a player who creates or joins without a token. */
export interface GuestAccount {
  token: string
  user: {
    id: string
    /** Unique handle - not for display. */
    username: string
    displayName: string
  }
}

/**
 * Create and join return the lobby plus, when the request carried no token,
 * the guest account the server just created for this player.
 */
export interface LobbyResponseWithGuest extends LobbyResponse {
  guest?: GuestAccount
}

/** Body the API returns alongside a non-2xx status. */
export interface ApiErrorBody {
  message?: string
}
