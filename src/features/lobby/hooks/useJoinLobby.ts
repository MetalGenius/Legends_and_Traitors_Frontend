import { useNavigate } from "react-router-dom";

// Placeholder handler — Task #41 replaces this with the real Join-Lobby API
// call and error handling (wrong code, full lobby, etc.).
export function useJoinLobby() {
  const navigate = useNavigate();

  const joinLobby = (lobbyCode: string) => {
    // TODO(#41): validate the code against the API first, and surface an
    // error instead of navigating when it is rejected.
    navigate(`/lobby/${lobbyCode}`);
  };

  return { joinLobby };
}
