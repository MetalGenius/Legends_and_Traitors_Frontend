import type { LobbyResponseWithGuest } from "@features/lobby/types/lobby";
import { useSessionStore } from "@shared/lib/session";

/**
 * Keeps the guest account the server created for us when we created or
 * joined a lobby without a token, so later requests carry it.
 */
export function saveGuestSession(response: LobbyResponseWithGuest) {
  if (!response.guest) return;
  const { token, user } = response.guest;
  useSessionStore.getState().setSession(token, { ...user, isGuest: true });
}
