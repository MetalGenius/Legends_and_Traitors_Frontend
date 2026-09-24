// PROVISIONAL CONTRACT - confirm the exact path and shape with Backend.
// The service and src/mocks/handlers.ts both type-check against this file;
// update it first when the real API is published.

export interface LobbyPlayer {
  id: string
  name: string
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
