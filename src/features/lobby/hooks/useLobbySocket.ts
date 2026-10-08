import { useEffect } from "react";

import { getLobbyState } from "@features/lobby/api/lobbyApi";
import { useLobbyStore } from "@features/lobby/stores/lobbyStore";
import { onReconnect, subscribe } from "@shared/lib/socket";

export const PLAYER_READY_CHANGED = "player_ready_changed";

/** The socket room carrying one lobby's live updates. */
export function lobbyRoom(lobbyCode: string) {
  return `lobby:${lobbyCode}`;
}

interface PlayerReadyChanged {
  playerId: string;
  isReady: boolean;
}

function isPlayerReadyChanged(data: unknown): data is PlayerReadyChanged {
  const d = data as Partial<PlayerReadyChanged> | null;
  return typeof d?.playerId === "string" && typeof d.isReady === "boolean";
}

/**
 * Keeps the lobby on screen live: while `lobbyCode` is set, listens to its
 * room and merges each player's ready changes into the store as they happen.
 * Pass null to stay unsubscribed (e.g. while still getting into the lobby).
 *
 * Our own toggles echo back here too; merging the same value again is a
 * no-op, so it never fights useReadyToggle's optimistic update.
 */
export function useLobbySocket(lobbyCode: string | null) {
  useEffect(() => {
    if (!lobbyCode) return;

    const stopListening = subscribe(lobbyRoom(lobbyCode), PLAYER_READY_CHANGED, (data) => {
      if (!isPlayerReadyChanged(data)) return;
      // The socket only passes on this lobby's room, so the event is ours;
      // the store, though, may have moved on to another lobby since.
      if (useLobbyStore.getState().lobby?.lobbyCode !== lobbyCode) return;
      useLobbyStore.getState().setPlayerReady(data.playerId, data.isReady);
    });

    // Anything broadcast while the connection was down is lost; catch up.
    const stopResyncing = onReconnect(() => {
      getLobbyState(lobbyCode)
        .then((response) => {
          if (useLobbyStore.getState().lobby?.lobbyCode === lobbyCode) {
            useLobbyStore.getState().setLobby(response.data);
          }
        })
        .catch(() => {
          // Keep what's on screen; the next event or reconnect will correct it.
        });
    });

    return () => {
      stopListening();
      stopResyncing();
    };
  }, [lobbyCode]);
}
