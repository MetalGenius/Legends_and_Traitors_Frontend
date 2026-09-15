import { useNavigate } from "react-router-dom";

const CODE_LENGTH = 6;
const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Stand-in for the code the API will return (#36). */
function placeholderCode(): string {
  return Array.from(
    { length: CODE_LENGTH },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
  ).join("");
}

// Placeholder handler — Task #36 replaces this with the real Create-Lobby
// API call, which will return the new lobby's code to navigate to.
export function useCreateLobby() {
  const navigate = useNavigate();

  const createLobby = () => {
    navigate(`/lobby/${placeholderCode()}`);
  };

  return { createLobby };
}
