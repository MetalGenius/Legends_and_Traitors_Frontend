// Placeholder handler — Task #36 replaces this with the real
// Create-Lobby API call and success/failure handling.
export function useCreateLobby() {
  const createLobby = async () => {
    console.log("Create Lobby clicked");
    await new Promise((resolve) => setTimeout(resolve, 5000)); // fake network delay
  };

  return { createLobby };
}
