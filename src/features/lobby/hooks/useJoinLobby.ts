import { useNavigate } from "react-router-dom";

import { joinLobby as joinLobbyRequest } from "@features/lobby/api/lobbyApi";
import { useLobbyStore } from "@features/lobby/stores/lobbyStore";

/**
 * Starts the join request and sends the user straight to the waiting room,
 * which (via useLobbyState) shows a loading state until the request succeeds
 * and bounces back Home with a message if it fails.
 */
export function useJoinLobby() {
  const navigate = useNavigate();
  const setPendingJoin = useLobbyStore((state) => state.setPendingJoin);

  const joinLobby = (lobbyCode: string) => {
    const request = joinLobbyRequest(lobbyCode);
    // useLobbyState handles the failure; this only stops it being reported as
    // unhandled if the lobby page never mounts to pick it up.
    request.catch(() => {});
    setPendingJoin({ code: lobbyCode, request });
    navigate(`/lobby/${lobbyCode}`);
  };

  return { joinLobby };
}
