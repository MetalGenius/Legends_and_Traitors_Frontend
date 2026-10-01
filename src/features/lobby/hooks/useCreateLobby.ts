import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError, createLobby as createLobbyRequest } from "@features/lobby/api/lobbyApi";
import { useLobbyStore } from "@features/lobby/stores/lobbyStore";
import { saveGuestSession } from "@features/lobby/utils/session";

export function useCreateLobby() {
  const navigate = useNavigate();
  const setLobby = useLobbyStore((state) => state.setLobby);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLobby = async () => {
    if (isCreating) return;

    setIsCreating(true);
    setError(null);
    try {
      const response = await createLobbyRequest();
      // First visit? The host needs the guest account the server just made,
      // or the waiting room won't recognise them as a player in their own lobby.
      saveGuestSession(response);
      setLobby(response.data);
      navigate(`/lobby/${response.data.lobbyCode}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't reach the server. Please check your connection and try again.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  return { createLobby, isCreating, error };
}
