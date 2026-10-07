import type { LobbyPlayer } from "@features/lobby/types/lobby";
import { MIN_PLAYERS } from "@shared/config/game";

export const NEED_MORE_PLAYERS_HINT = `Need at least ${MIN_PLAYERS} players`;
export const WAITING_FOR_READY_HINT = "Waiting for all players to be ready";

/**
 * Whether the host can start the game now, and if not, why. A game needs at
 * least MIN_PLAYERS players (not a full lobby) and every one of them ready.
 * Too few players is reported first: readying up won't fix that.
 */
export function getStartGameStatus(players: LobbyPlayer[]): {
  canStart: boolean;
  hint: string | null;
} {
  if (players.length < MIN_PLAYERS) {
    return { canStart: false, hint: NEED_MORE_PLAYERS_HINT };
  }
  if (!players.every((player) => player.isReady)) {
    return { canStart: false, hint: WAITING_FOR_READY_HINT };
  }
  return { canStart: true, hint: null };
}
