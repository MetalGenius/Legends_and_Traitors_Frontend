import { useNavigate } from "react-router-dom";

// Placeholder handler — Task #41 replaces this with the real
// Join-Lobby API call and error handling (wrong code, full lobby, etc.).
export function useJoinLobby() {
  const navigate = useNavigate();

  const joinLobby = (lobbyCode: string) => {
    // TODO(#41): call Join-Lobby API, then navigate into the waiting-room
    // route (e.g. `/lobby/${lobbyCode}`) on success, or surface an error on
    // failure (invalid code, full lobby, etc.). The waiting-room screen
    // doesn't exist yet, so for now redirect back to Home instead of
    // navigating into a lobby that can't be rendered.
    console.log("Join lobby with code:", lobbyCode);
    navigate("/");
  };

  return { joinLobby };
}
