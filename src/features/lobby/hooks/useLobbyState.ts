import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError, getLobbyState } from "@features/lobby/api/lobbyApi";
import { useLobbyStore } from "@features/lobby/stores/lobbyStore";
import { usePlayerStore } from "@features/lobby/stores/playerStore";
import { useSessionStore } from "@shared/lib/session";

export const INVALID_CODE_MESSAGE =
  "That lobby code is invalid or has expired.";
export const LOAD_FAILED_MESSAGE =
  "Couldn't load that lobby. Please try again.";
export const LOBBY_FULL_MESSAGE = "That lobby is full.";
export const GAME_STARTED_MESSAGE = "That game has already started.";
export const JOIN_FAILED_MESSAGE =
  "Couldn't join that lobby. Please try again.";

function failureMessage(error: unknown, isJoin: boolean): string {
  const status = error instanceof ApiError ? error.status : null;
  if (status === 404) return INVALID_CODE_MESSAGE;
  if (isJoin && status === 409) return LOBBY_FULL_MESSAGE;
  if (isJoin && status === 400) return GAME_STARTED_MESSAGE;
  return isJoin ? JOIN_FAILED_MESSAGE : LOAD_FAILED_MESSAGE;
}

/**
 * Loads the lobby named in the URL and puts it in the store. If the user just
 * asked to join it from Home (see useJoinLobby), waits on that join request
 * instead of fetching. Any failure - a 404 for a code that never existed or
 * has expired, a full or already-started lobby, a server error, or a dropped
 * connection - sends the user back to Home with an explanation rather than
 * leaving them on a screen that never finishes loading.
 */
export function useLobbyState(code: string | undefined) {
  const navigate = useNavigate();
  const setLobby = useLobbyStore((state) => state.setLobby);
  const clearLobby = useLobbyStore((state) => state.clearLobby);
  const clearPendingJoin = useLobbyStore((state) => state.clearPendingJoin);
  const setDisplayName = usePlayerStore((state) => state.setDisplayName);
  const clearPlayer = usePlayerStore((state) => state.clearPlayer);
  const pendingJoinCode = useLobbyStore((state) => state.pendingJoin?.code);
  // The code whose fetch has settled, either way. Deriving isLoading from it
  // keeps setState out of the effect, and means a different code re-enters
  // loading during render rather than after a second pass.
  const [settledCode, setSettledCode] = useState<string | null>(null);
  const isLoading = Boolean(code) && settledCode !== code;
  const isJoining = isLoading && pendingJoinCode === code;

  useEffect(() => {
    if (!code) {
      clearLobby();
      navigate("/", { state: { lobbyError: INVALID_CODE_MESSAGE } });
      return;
    }

    // Set by the cleanup below so a lobby that resolves after the user has
    // navigated away can't write to the store or redirect them.
    let cancelled = false;

    // Read once rather than subscribed: clearing it once settled mustn't
    // re-run this effect.
    const pendingJoin = useLobbyStore.getState().pendingJoin;
    const join = pendingJoin?.code === code ? pendingJoin : null;
    const request = join ? join.request : getLobbyState(code);

    request
      .then((response) => {
        if (cancelled) return;
        setLobby(response.data);
        if (!join) return;
        // Remember the name the lobby shows for us, found by account id.
        const accountId = useSessionStore.getState().account?.id;
        const me = response.data.players.find((p) => p.id === accountId);
        if (me) setDisplayName(me.username);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Don't let the previous lobby linger on screen behind the redirect.
        clearLobby();
        clearPlayer();
        navigate("/", {
          state: { lobbyError: failureMessage(error, Boolean(join)) },
        });
      })
      .finally(() => {
        // Settle first so isJoining never flips to false while still loading.
        if (!cancelled) setSettledCode(code);
        // Even if cancelled: a settled join is spent either way, and leaving
        // it would make a later visit wait on a stale result.
        if (join && useLobbyStore.getState().pendingJoin === join) {
          clearPendingJoin();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    code,
    navigate,
    setLobby,
    clearLobby,
    clearPendingJoin,
    setDisplayName,
    clearPlayer,
  ]);

  return { isLoading, isJoining };
}
