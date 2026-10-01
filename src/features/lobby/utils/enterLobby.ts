import { getLobbyState, joinLobby } from "@features/lobby/api/lobbyApi";
import { useLobbyStore } from "@features/lobby/stores/lobbyStore";
import type { LobbyData } from "@features/lobby/types/lobby";
import { saveGuestSession } from "@features/lobby/utils/session";
import { useSessionStore } from "@shared/lib/session";

/** Which request failed, so the caller can explain it accurately. */
export class EnterLobbyError extends Error {
  readonly step: "load" | "join";
  readonly cause: unknown;

  constructor(step: "load" | "join", cause: unknown) {
    super(cause instanceof Error ? cause.message : `Failed to ${step} lobby`);
    this.name = "EnterLobbyError";
    this.step = step;
    this.cause = cause;
  }
}

async function loadOrJoin(code: string): Promise<LobbyData> {
  const { setJoiningCode } = useLobbyStore.getState();
  setJoiningCode(null);

  // With no session we can't already be a player, so skip straight to the
  // join - that's also what gets us a guest account.
  const { token, account } = useSessionStore.getState();
  if (token && account) {
    let current: LobbyData;
    try {
      current = (await getLobbyState(code)).data;
    } catch (error) {
      throw new EnterLobbyError("load", error);
    }
    // Host, a refresh, or the back button: already in, nothing to join.
    if (current.players.some((player) => player.id === account.id)) {
      return current;
    }
  }

  setJoiningCode(code);
  try {
    const response = await joinLobby(code);
    saveGuestSession(response);
    return response.data;
  } catch (error) {
    throw new EnterLobbyError("join", error);
  }
}

// One request per code at a time, so StrictMode's double effect (or two
// components mounting together) can't join twice.
const inFlight = new Map<string, Promise<LobbyData>>();

/**
 * Gets the current player into the lobby for `code`, however they arrived -
 * an invite link, a code typed on Home, the host after creating it, or a
 * refresh. Joins only if they aren't a player in it already.
 */
export function enterLobby(code: string): Promise<LobbyData> {
  const existing = inFlight.get(code);
  if (existing) return existing;

  const request = loadOrJoin(code).finally(() => {
    inFlight.delete(code);
  });
  inFlight.set(code, request);
  return request;
}
