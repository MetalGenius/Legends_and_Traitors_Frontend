interface CreateLobbyButtonProps {
  onCreateLobby?: () => void | Promise<void>;
  /** Classes for the outer <button> (e.g. border box). */
  className?: string;
  /** Classes for the inner <span> (e.g. orange fill, text styling). */
  innerClassName?: string;
  label?: string;
}

export default function CreateLobbyButton({
  onCreateLobby = () => {},
  className = "",
  innerClassName = "",
  label = "CREATE",
}: CreateLobbyButtonProps) {
  const handleClick = () => {
    // No in-flight state: the click navigates straight to the lobby room.
    // If a handler ever returns a rejected promise, swallow it here so it
    // doesn't surface as an unhandled rejection (real error handling: #36).
    void Promise.resolve(onCreateLobby()).catch((error: unknown) => {
      console.error("Create lobby failed:", error);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid="create-lobby-button"
      className={className}
    >
      <span className={innerClassName}>{label}</span>
    </button>
  );
}
