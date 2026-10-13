import { useRef, useState } from "react";

import { ApiError, setReadyState } from "@features/lobby/api/lobbyApi";
import { useLobbyStore } from "@features/lobby/stores/lobbyStore";
import { useSessionStore } from "@shared/lib/session";

export const READY_FAILED_MESSAGE =
  "Couldn't update your ready status. Please try again.";

/**
 * Toggles the current player's ready flag in `lobbyCode`. Optimistic: the
 * card flips the moment it's clicked, and flips back if the server refuses
 * or can't be reached. Only ever touches the current player's own flag.
 */
export function useReadyToggle(lobbyCode: string) {
  const setPlayerReady = useLobbyStore((state) => state.setPlayerReady);
  const checkpoint = useLobbyStore((state) => state.checkpoint);
  const mergeLobby = useLobbyStore((state) => state.mergeLobby);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A ref as well as state: a second click can land before the re-render
  // that would show isSaving, and must not send a second request.
  const inFlight = useRef(false);

  const toggleReady = async () => {
    if (inFlight.current) return;
    const accountId = useSessionStore.getState().account?.id;
    const lobby = useLobbyStore.getState().lobby;
    const me = lobby?.players.find((player) => player.id === accountId);
    if (!lobby || lobby.lobbyCode !== lobbyCode || !me) return;

    const previous = me.isReady;
    const next = !previous;
    // Only apply the response to the lobby it's about - the user may have
    // left for another one while the request was out.
    const stillHere = () => useLobbyStore.getState().lobby?.lobbyCode === lobbyCode;

    inFlight.current = true;
    setIsSaving(true);
    setError(null);
    setPlayerReady(me.id, next);
    // Whatever changes from here on is newer than this request's answer.
    const since = checkpoint();
    try {
      const response = await setReadyState(lobbyCode, next);
      // Take the server's lobby (players may have come or gone) - except for
      // ready changes that arrived live while we waited, which it predates.
      if (stillHere()) mergeLobby(response.data, since);
    } catch (err) {
      if (stillHere()) setPlayerReady(me.id, previous);
      setError(
        err instanceof ApiError && err.serverMessage
          ? err.serverMessage
          : READY_FAILED_MESSAGE,
      );
    } finally {
      inFlight.current = false;
      setIsSaving(false);
    }
  };

  return { toggleReady, isSaving, error };
}
