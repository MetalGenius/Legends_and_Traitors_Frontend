import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError } from "@features/lobby/api/lobbyApi";
import { useLobbyStore } from "@features/lobby/stores/lobbyStore";
import { usePlayerStore } from "@features/lobby/stores/playerStore";
import { EnterLobbyError, enterLobby } from "@features/lobby/utils/enterLobby";
import { useSessionStore } from "@shared/lib/session";

export const INVALID_CODE_MESSAGE =
  "That lobby code is invalid or has expired.";
export const LOAD_FAILED_MESSAGE =
  "Couldn't load that lobby. Please try again.";
export const LOBBY_FULL_MESSAGE = "That lobby is full.";
export const GAME_STARTED_MESSAGE = "That game has already started.";
export const JOIN_FAILED_MESSAGE =
  "Couldn't join that lobby. Please try again.";

/**
 * The server's own message when the response had one; otherwise (no
 * response at all, or no usable body) our best explanation for the status.
 */
function failureMessage(error: unknown): string {
  const step = error instanceof EnterLobbyError ? error.step : "load";
  const cause = error instanceof EnterLobbyError ? error.cause : error;
  if (cause instanceof ApiError && cause.serverMessage) {
    return cause.serverMessage;
  }
  const status = cause instanceof ApiError ? cause.status : null;
  if (status === 404) return INVALID_CODE_MESSAGE;
  if (status === 409) return LOBBY_FULL_MESSAGE;
  if (status === 400) return GAME_STARTED_MESSAGE;
  return step === "join" ? JOIN_FAILED_MESSAGE : LOAD_FAILED_MESSAGE;
}

/**
 * Gets the player into the lobby named in the URL - joining it if they
 * aren't a player yet - and puts it in the store. Every way of arriving
 * works the same: an invite link, a code typed on Home, the host after
 * creating it, or a refresh. Any failure - a 404 for a code that never
 * existed or has expired, a full or already-started lobby, a server error,
 * or a dropped connection - sends the user back to Home with an explanation
 * (the server's message when it gave one) rather than leaving them on a
 * screen that never finishes loading.
 */
export function useLobbyState(code: string | undefined) {
  const navigate = useNavigate();
  const setLobby = useLobbyStore((state) => state.setLobby);
  const clearLobby = useLobbyStore((state) => state.clearLobby);
  const joiningCode = useLobbyStore((state) => state.joiningCode);
  const setDisplayName = usePlayerStore((state) => state.setDisplayName);
  const clearPlayer = usePlayerStore((state) => state.clearPlayer);
  // The code whose request has settled, either way. Deriving isLoading from
  // it keeps setState out of the effect, and means a different code re-enters
  // loading during render rather than after a second pass.
  const [settledCode, setSettledCode] = useState<string | null>(null);
  const isLoading = Boolean(code) && settledCode !== code;
  const isJoining = isLoading && joiningCode === code;

  useEffect(() => {
    if (!code) {
      clearLobby();
      navigate("/", { state: { lobbyError: INVALID_CODE_MESSAGE } });
      return;
    }

    // Set by the cleanup below so a lobby that resolves after the user has
    // navigated away can't write to the store or redirect them.
    let cancelled = false;

    enterLobby(code)
      .then((lobby) => {
        if (cancelled) return;
        setLobby(lobby);
        // Remember the name the lobby shows for us, found by account id
        // (saved by now, even if this visit is what created the guest).
        const accountId = useSessionStore.getState().account?.id;
        const me = lobby.players.find((player) => player.id === accountId);
        if (me) setDisplayName(me.username);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Don't let the previous lobby linger on screen behind the redirect.
        clearLobby();
        clearPlayer();
        navigate("/", { state: { lobbyError: failureMessage(error) } });
      })
      .finally(() => {
        if (!cancelled) setSettledCode(code);
      });

    return () => {
      cancelled = true;
    };
  }, [code, navigate, setLobby, clearLobby, setDisplayName, clearPlayer]);

  return { isLoading, isJoining };
}
