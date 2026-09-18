interface CreateLobbyButtonProps {
  onCreateLobby?: () => void | Promise<void>;
  /** Externally-controlled in-flight state (e.g. from useCreateLobby). */
  disabled?: boolean;
  /** Classes for the outer <button> (e.g. border box). */
  className?: string;
  /** Classes for the inner <span> (e.g. orange fill, text styling). */
  innerClassName?: string;
  label?: string;
  loadingLabel?: string;
}

export default function CreateLobbyButton({
  onCreateLobby = () => {},
  disabled = false,
  className = "",
  innerClassName = "",
  label = "CREATE",
  loadingLabel = "CREATING...",
}: CreateLobbyButtonProps) {
  const handleClick = () => {
    if (disabled) return;
    // Swallow a rejected handler here so it doesn't surface as an unhandled
    // rejection - real error handling lives in the caller (useCreateLobby).
    void Promise.resolve(onCreateLobby()).catch((error: unknown) => {
      console.error("Create lobby failed:", error);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      data-testid="create-lobby-button"
      className={`${className} disabled:cursor-not-allowed disabled:opacity-70`}
    >
      <span className={innerClassName}>{disabled ? loadingLabel : label}</span>
    </button>
  );
}
