import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError, getLobbyState } from "@features/lobby/api/lobbyApi";
import { useLobbyStore } from "@features/lobby/stores/lobbyStore";

export const INVALID_CODE_MESSAGE =
  "That lobby code is invalid or has expired.";
export const LOAD_FAILED_MESSAGE =
  "Couldn't load that lobby. Please try again.";

/**
 * Loads the lobby named in the URL and puts it in the store. Any failure -
 * a 404 for a code that never existed or has expired, a server error, or a
 * dropped connection - sends the user back to Home with an explanation
 * rather than leaving them on a screen that never finishes loading.
 */
export function useLobbyState(code: string | undefined) {
  const navigate = useNavigate();
  const setLobby = useLobbyStore((state) => state.setLobby);
  const clearLobby = useLobbyStore((state) => state.clearLobby);
  // The code whose fetch has settled, either way. Deriving isLoading from it
  // keeps setState out of the effect, and means a different code re-enters
  // loading during render rather than after a second pass.
  const [settledCode, setSettledCode] = useState<string | null>(null);
  const isLoading = Boolean(code) && settledCode !== code;

  useEffect(() => {
    if (!code) {
      clearLobby();
      navigate("/", { state: { lobbyError: INVALID_CODE_MESSAGE } });
      return;
    }

    // Set by the cleanup below so a lobby that resolves after the user has
    // navigated away can't write to the store or redirect them.
    let cancelled = false;

    getLobbyState(code)
      .then((response) => {
        if (cancelled) return;
        setLobby(response.data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Don't let the previous lobby linger on screen behind the redirect.
        clearLobby();
        navigate("/", {
          state: {
            lobbyError:
              error instanceof ApiError && error.status === 404
                ? INVALID_CODE_MESSAGE
                : LOAD_FAILED_MESSAGE,
          },
        });
      })
      .finally(() => {
        if (cancelled) return;
        setSettledCode(code);
      });

    return () => {
      cancelled = true;
    };
  }, [code, navigate, setLobby, clearLobby]);

  return { isLoading };
}
