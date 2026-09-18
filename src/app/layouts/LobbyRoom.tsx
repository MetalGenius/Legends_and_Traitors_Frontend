import { useParams } from "react-router-dom";

import backgroundImage from "@assets/images/homescreen.avif";
import { useCopyInviteLink, useLobbyStore, PlayerListItem } from "@features/lobby";

interface Player {
  id: string;
  name: string;
  avatarUrl?: string;
  isHost?: boolean;
}

interface LobbyScreenProps {
  username?: string;
  /** Overrides the code from the URL; the /lobby/:code param wins by default. */
  RoomID?: string;
  maxPlayers?: number;
  players?: Player[];
  onStartGame?: () => void;
  onLeaveGame?: () => void;
}

const DEFAULT_PLAYERS: Player[] = [
  { id: "1", name: "Player 1", isHost: true },
  { id: "2", name: "Player 1" },
  { id: "3", name: "Player 1" },
];

export default function LobbyScreen({
  username = "Guest92117",
  RoomID,
  maxPlayers: maxPlayersProp = 10,
  players: playersProp = DEFAULT_PLAYERS,
  onStartGame,
  onLeaveGame,
}: LobbyScreenProps) {
  // The lobby code now arrives in the URL (/lobby/:code); the prop is only a
  // fallback for rendering the screen outside the router (tests, storybook).
  const { code } = useParams<{ code?: string }>();
  const lobbyCode = code ?? RoomID ?? "";
  const inviteLink = `${window.location.origin}/lobby/${lobbyCode}`;
  const { copied, copyInviteLink } = useCopyInviteLink(inviteLink);

  // Once Create/Join Lobby actually calls the API, this holds the real
  // response (lobbyCode, maxPlayers, players). Falls back to props/defaults
  // when nothing's been created yet (direct URL visit, tests, storybook).
  const lobby = useLobbyStore((state) => state.lobby);
  const maxPlayers = lobby?.maxPlayers ?? maxPlayersProp;
  const players = lobby?.players ?? playersProp;

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
        <span className="text-lg font-medium px-4 py-2 rounded-sm tracking-wide">
          {username}
        </span>
      </header>

      {/* Main lobby content */}
      <main
        className="flex-1 flex flex-col items-center justify-center px-8 py-10 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.65)), url(${backgroundImage})`,
        }}
      >
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
            className="mb-4 text-2xl text-gray-200 "
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
            Player ({players.length}/{maxPlayers})
          </p>

          {/* Player cards */}
          <div className="flex flex-wrap justify-center gap-8 mb-15 mt-10">
            {players.map((player) => (
              <PlayerListItem key={player.id} name={player.name} isHost={player.isHost} />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-10">
            <button
              type="button"
              onClick={onStartGame}
              className="bg-[#f9b658] hover:bg-[#ffc670] text-white !font-extrabold text-xl tracking-wide uppercase px-14 py-5 rounded-md transition-transform duration-150 hover:scale-[1.03] active:scale-95"
            >
              Start Game
            </button>
            <button
              type="button"
              onClick={onLeaveGame}
              className="bg-[#4a4a4a] hover:bg-[#5c5c5c] text-white !font-extrabold text-xl tracking-wide uppercase px-14 py-5 rounded-md transition-transform duration-150 hover:scale-[1.03] active:scale-95"
            >              
              Leave Game
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}