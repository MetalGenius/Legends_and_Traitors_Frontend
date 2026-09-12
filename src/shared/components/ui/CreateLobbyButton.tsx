import { useState, useCallback } from "react";

interface CreateLobbyButtonProps {
  onCreateLobby?: () => Promise<void>;
  /** Classes for the outer <button> (e.g. border box). */
  className?: string;
  /** Classes for the inner <span> (e.g. orange fill, text styling). */
  innerClassName?: string;
  label?: string;
  loadingLabel?: string;
}

/**
 * CreateLobbyButton
 *
 * Entry point for creating a lobby from the Home screen.
 * Available to both guest and logged-in users — no auth gate.
 *
 * The actual API call / success-failure handling is out of scope for this
 * component (see #36); `onCreateLobby` is a placeholder hook that Task 2
 * will wire up to the real request. This component only owns the
 * `isCreating` local state so the button can disable itself while a
 * request is in flight.
 */
export default function CreateLobbyButton({
  onCreateLobby = () => Promise.resolve(),
  className = "",
  innerClassName = "",
  label = "CREATE",
  loadingLabel = "CREATING...",
}: CreateLobbyButtonProps) {
  const [isCreating, setIsCreating] = useState(false);

  const handleClick = useCallback(async () => {
    if (isCreating) return;

    setIsCreating(true);
    try {
      await onCreateLobby();
    } finally {
      // No error handling here by design (covered in Task #36) — this just
      // ensures the button re-enables regardless of outcome.
      setIsCreating(false);
    }
  }, [isCreating, onCreateLobby]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isCreating}
      aria-busy={isCreating}
      data-testid="create-lobby-button"
      className={`${className} disabled:cursor-not-allowed`}
    >
      <span className={innerClassName}>
        {isCreating ? loadingLabel : label}
      </span>
    </button>
  );
}