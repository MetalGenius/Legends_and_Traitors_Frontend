import { useId } from "react";

import type { LobbyPlayer } from "@features/lobby/types/lobby";
import { getStartGameStatus } from "@features/lobby/utils/startGame";

interface StartGameButtonProps {
  players: LobbyPlayer[];
  onStart?: () => void;
}

/**
 * The host's Start Game button. While the game can't start it stays visible
 * but inert, and hovering or focusing it explains why.
 */
export default function StartGameButton({ players, onStart }: StartGameButtonProps) {
  const { canStart, hint } = getStartGameStatus(players);
  const hintId = useId();

  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        // aria-disabled, not `disabled`: a truly disabled button gets no
        // hover in Chromium, so the hint below could never appear.
        aria-disabled={!canStart}
        aria-describedby={hint ? hintId : undefined}
        data-testid="start-game-button"
        onClick={() => {
          if (canStart) onStart?.();
        }}
        className={`bg-[#f9b658] text-white !font-extrabold text-xl tracking-wide uppercase px-14 py-5 rounded-md transition-transform duration-150 ${
          canStart
            ? "hover:bg-[#ffc670] hover:scale-[1.03] active:scale-95 cursor-pointer"
            : "opacity-50 cursor-not-allowed"
        }`}
      >
        Start Game
      </button>
      {hint && (
        <span
          id={hintId}
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/90 px-3 py-2 text-sm text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        >
          {hint}
        </span>
      )}
    </span>
  );
}
