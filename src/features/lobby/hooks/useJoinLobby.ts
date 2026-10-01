import { useNavigate } from "react-router-dom";

/**
 * Typing a code on Home does exactly what opening an invite link does: go to
 * the lobby's URL. The waiting room (useLobbyState) joins, shows the loading
 * state, and bounces back Home with a message if it can't.
 */
export function useJoinLobby() {
  const navigate = useNavigate();

  const joinLobby = (lobbyCode: string) => {
    navigate(`/lobby/${lobbyCode}`);
  };

  return { joinLobby };
}
