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
  maxPlayers: number
  players: LobbyPlayer[]
}

/** Envelope shared by both create (POST) and fetch (GET) lobby responses. */
export interface LobbyResponse {
  status: string
  data: LobbyData
}

/** Body the API returns alongside a non-2xx status. */
export interface ApiErrorBody {
  message?: string
}
