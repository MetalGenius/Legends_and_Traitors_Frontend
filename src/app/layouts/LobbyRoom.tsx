import { useParams } from "react-router-dom";

import backgroundImage from "@assets/images/homescreen.avif";
import {
  useCopyInviteLink,
  useLobbyState,
  useLobbyStore,
  usePlayerStore,
  useReadyToggle,
  PlayerListItem,
  StartGameButton,
} from "@features/lobby";
import { MAX_PLAYERS } from "@shared/config/game";
import { useSessionStore } from "@shared/lib/session";

interface LobbyScreenProps {
  onStartGame?: () => void;
  onLeaveGame?: () => void;
}

export default function LobbyScreen({
  onStartGame,
  onLeaveGame,
}: LobbyScreenProps) {
  const { code } = useParams<{ code?: string }>();
  // Loads the lobby into the store, or redirects Home if the code is bad.
  const { isLoading, isJoining } = useLobbyState(code);
  const lobby = useLobbyStore((state) => state.lobby);
  // The name this lobby knows us by once joined, else the account's own
  // display name (never the username handle).
  const playerName = usePlayerStore((state) => state.displayName);
  const accountName = useSessionStore((state) => state.account?.displayName);
  const currentUserId = useSessionStore((state) => state.account?.id);
  const displayName = playerName ?? accountName ?? "";

  // Only the host gets a Start Game button.
  const isHost = Boolean(
    lobby?.players.some((player) => player.id === currentUserId && player.isHost),
  );

  const lobbyCode = lobby?.lobbyCode ?? code ?? "";
  const inviteLink = `${window.location.origin}/lobby/${lobbyCode}`;
  const { copied, copyInviteLink } = useCopyInviteLink(inviteLink);
  const {
    toggleReady,
    isSaving: isSavingReady,
    error: readyError,
  } = useReadyToggle(lobbyCode);

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col">
      {/* Top nav bar */}
      <header className="w-full bg-[#1a1a1a] h-[76px] px-8 flex items-center justify-between gap-6">
        <span
          className="text-lg font-bold tracking-wide"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Three Cock
        </span>
        <span
          data-testid="header-display-name"
          className="text-lg font-medium px-4 py-2 rounded-sm tracking-wide"
        >
          {displayName}
        </span>
      </header>

      {/* Main lobby content */}
      <main
        className="flex-1 flex flex-col items-center justify-center px-8 py-10 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.65)), url(${backgroundImage})`,
        }}
      >
        {isLoading || !lobby ? (
          <p
            data-testid="lobby-loading"
            className="text-3xl"
            style={{ fontFamily: "Instrument Serif, serif" }}
          >
            {isJoining ? "Joining lobby..." : "Loading lobby..."}
          </p>
        ) : (
          <div className="w-full max-w-5xl">
            {/* Lobby code */}
            <div
              className="mb-4 flex items-center gap-3 text-3xl tracking-wide font-bold"
              style={{ fontFamily: "Instrument Serif, serif" }}
            >
              <span>Room ID :</span>
              <span className="text-red-500 font-bold text-3xl">{lobbyCode}</span>
            </div>

            {/* Invite description */}
            <p
              className="mb-4 text-2xl text-gray-200"
              style={{ fontFamily: "Instrument Serif, serif" }}
            >
              Copy and share this link to invite other players.
            </p>

            {/* Invite link */}
            <button
              type="button"
              onClick={copyInviteLink}
              className="mx-auto mt-5 block w-full max-w-3xl text-center bg-white !text-black px-8 py-5 !text-2xl rounded-md shadow-md mb-10 hover:bg-gray-100 transition-transform duration-150 hover:scale-[1.01] active:scale-95"
              title="Click to copy invite link"
            >
              {copied ? "Copied!" : inviteLink}
            </button>

            {/* Player count */}
            <p
              className="text-3xl mb-5 font-bold"
              style={{ fontFamily: "Instrument Serif, serif" }}
            >
              Player ({lobby.players.length}/{MAX_PLAYERS})
            </p>

            {/* Player cards */}
            <div className="flex flex-wrap justify-center gap-8 mb-15 mt-10">
              {lobby.players.map((player) => (
                <PlayerListItem
                  key={player.id}
                  player={player}
                  isCurrentUser={player.id === currentUserId}
                  onToggleReady={toggleReady}
                  isSavingReady={isSavingReady}
                />
              ))}
            </div>

            {readyError && (
              <p className="text-center text-red-400 text-sm mb-6" role="alert">
                {readyError}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-10">
              {isHost && (
                <StartGameButton players={lobby.players} onStart={onStartGame} />
              )}
              <button
                type="button"
                onClick={onLeaveGame}
                className="bg-[#4a4a4a] hover:bg-[#5c5c5c] text-white !font-extrabold text-xl tracking-wide uppercase px-14 py-5 rounded-md transition-transform duration-150 hover:scale-[1.03] active:scale-95"
              >
                Leave Game
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
