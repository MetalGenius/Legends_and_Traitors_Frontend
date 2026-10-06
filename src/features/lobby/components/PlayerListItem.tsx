import { Crown } from "lucide-react";

import ReadyToggle from "@features/lobby/components/ReadyToggle";
import type { LobbyPlayer } from "@features/lobby/types/lobby";

interface PlayerListItemProps {
  player: LobbyPlayer;
  /** This card is the current player's own - the only one they can toggle. */
  isCurrentUser?: boolean;
  onToggleReady?: () => void;
  isSavingReady?: boolean;
}

const CARD_CLASS =
  "relative block w-56 p-0 rounded-xl border-4 border-[#e0a548] bg-[#d9d9d9] overflow-hidden transition-transform duration-150 hover:scale-[1.03]";

export default function PlayerListItem({
  player,
  isCurrentUser = false,
  onToggleReady,
  isSavingReady = false,
}: PlayerListItemProps) {
  const { username, isHost, isReady } = player;
  const initial = username.trim().charAt(0).toUpperCase();

  // Spans throughout (styled as blocks) so the same content is valid inside
  // the <button> the current player's card becomes.
  const content = (
    <>
      {isHost && (
        <Crown
          data-testid="host-crown"
          className="absolute top-2 right-2 text-yellow-400 fill-yellow-400"
          size={24}
        />
      )}
      <span className="h-44 bg-[#9c9c9c] flex items-center justify-center text-5xl font-bold text-white">
        {initial}
      </span>
      {/* Your own card is marked by a gold name - deep enough to read on the grey. */}
      <span
        data-testid="player-name"
        className={`block text-center py-3 text-base ${
          isCurrentUser ? "text-[#b7791f] font-bold" : "text-black"
        }`}
      >
        {username}
      </span>
      <ReadyToggle isReady={isReady} isSaving={isCurrentUser && isSavingReady} />
    </>
  );

  if (!isCurrentUser || !onToggleReady) {
    return <div className={CARD_CLASS}>{content}</div>;
  }

  // The player's own card is the ready switch: press it to flip their status.
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isReady}
      aria-busy={isSavingReady}
      aria-label="Ready"
      title="Click to toggle ready"
      data-testid="own-player-card"
      onClick={() => {
        if (!isSavingReady) onToggleReady();
      }}
      // No border of its own; the focus ring only shows for keyboard users.
      className={`${CARD_CLASS} focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white ${
        isSavingReady ? "cursor-wait" : "cursor-pointer"
      }`}
    >
      {content}
    </button>
  );
}
