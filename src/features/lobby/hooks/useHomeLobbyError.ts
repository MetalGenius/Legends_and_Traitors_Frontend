import { useLocation } from "react-router-dom";

/**
 * Message left behind by a redirect away from a lobby that couldn't be
 * loaded (see useLobbyState). Lives in router state rather than the store
 * because it's transient UI, not application state.
 */
export function useHomeLobbyError(): string | null {
  const { state } = useLocation();
  const lobbyError = (state as { lobbyError?: unknown } | null)?.lobbyError;

  return typeof lobbyError === "string" ? lobbyError : null;
}
