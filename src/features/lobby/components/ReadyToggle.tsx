interface ReadyToggleProps {
  isReady: boolean;
  /** A change to this status is being saved. */
  isSaving?: boolean;
}

/**
 * A player's Ready / Not Ready status. It isn't a control itself: on the
 * current player's own card, the whole card is what toggles it (see
 * PlayerListItem). A <span>, so it can sit inside that card's <button>.
 */
export default function ReadyToggle({ isReady, isSaving = false }: ReadyToggleProps) {
  return (
    <span
      data-testid="player-ready-status"
      className={`block text-center text-xs font-bold uppercase tracking-wide pb-2 ${
        isReady ? "text-green-700" : "text-gray-500"
      } ${isSaving ? "opacity-60" : ""}`}
    >
      {isReady ? "Ready" : "Not Ready"}
    </span>
  );
}
