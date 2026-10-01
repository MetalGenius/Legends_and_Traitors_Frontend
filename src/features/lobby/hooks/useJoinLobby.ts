import { useNavigate } from "react-router-dom";

import { joinLobby as joinLobbyRequest } from "@features/lobby/api/lobbyApi";
import { useLobbyStore } from "@features/lobby/stores/lobbyStore";
import { useSessionStore } from "@shared/lib/session";

/**
 * Starts the join request and sends the user straight to the waiting room,
 * which (via useLobbyState) shows a loading state until the request succeeds
 * and bounces back Home with a message if it fails.
 */
export function useJoinLobby() {
  const navigate = useNavigate();
  const setPendingJoin = useLobbyStore((state) => state.setPendingJoin);
  const setSession = useSessionStore((state) => state.setSession);

  const joinLobby = (lobbyCode: string) => {
    const request = joinLobbyRequest(lobbyCode).then((response) => {
      // First join without a token: keep the guest account the server made,
      // so later requests (and the header) know who we are. Done here, before
      // the waiting room sees the response, so it can find us by account id -
      // and kept even if the user has already navigated away.
      if (response.guest) {
        const { token, user } = response.guest;
        setSession(token, { ...user, isGuest: true });
      }
      return response;
    });
    // useLobbyState handles the failure; this only stops it being reported as
    // unhandled if the lobby page never mounts to pick it up.
    request.catch(() => {});
    setPendingJoin({ code: lobbyCode, request });
    navigate(`/lobby/${lobbyCode}`);
  };

  return { joinLobby };
}
