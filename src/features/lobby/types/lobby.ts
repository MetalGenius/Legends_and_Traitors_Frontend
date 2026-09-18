// PROVISIONAL CONTRACT - confirm the exact path and shape with Backend.
// The service and src/mocks/handlers.ts both type-check against this file;
// update it first when the real API is published.

export interface LobbyPlayer {
  id: string
  name: string
  isHost: boolean
}

export interface LobbyData {
  lobbyCode: string
  lobbyUrl: string
  hostId: string
  maxPlayers: number
  players: LobbyPlayer[]
}

export interface CreateLobbyResponse {
  status: string
  data: LobbyData
}

/** Body the API returns alongside a non-2xx status. */
export interface ApiErrorBody {
  message?: string
}
