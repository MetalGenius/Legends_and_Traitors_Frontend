// Placeholder handler — Task #41 replaces this with the real
// Join-Lobby API call and error handling (wrong code, full lobby, etc.).
export function useJoinLobby() {
  const joinLobby = (lobbyCode: string) => {
    // TODO(#41): call Join-Lobby API, navigate into the lobby on success,
    // surface an error on failure (invalid code, full lobby, etc.).
    console.log("Join lobby with code:", lobbyCode);
  };

  return { joinLobby };
}
