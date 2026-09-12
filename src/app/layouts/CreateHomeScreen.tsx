import { useState } from "react";
import { useParams } from "react-router-dom";
import backgroundImage from "@assets/images/homescreen.avif";
import CreateLobbyButton from "@shared/components/ui/CreateLobbyButton.tsx";
import JoinLobbyInput from "@shared/components/ui/JoinLobbyInput.tsx";
import { useCreateLobby, useJoinLobby } from "@features/lobby";

export default function ThreeCockOnlineLanding() {
  const [roomId, setRoomId] = useState("");
  const { createLobby } = useCreateLobby();
  const { joinLobby } = useJoinLobby();
  // Populated when the user arrives via /join/:code
  const { code } = useParams<{ code?: string }>();

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col">
      {/* Top nav bar */}
      <header className="w-full bg-[#1a1a1a] px-8 py-5 flex items-center justify-between gap-6">
        <span
          className="text-lg font-bold tracking-wide"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Three Cock
        </span>
        <div className="flex items-center gap-6">
          <button className="text-sm text-gray-200 hover:text-white transition-colors">
            Sign in
          </button>
          <button className="bg-white !text-black text-sm font-medium px-6 py-2 rounded-sm hover:bg-gray-200 transition-colors">
            Login
          </button>
        </div>
      </header>

      {/* Hero section with background image */}
      <main
        className="flex-1 relative flex flex-col items-center justify-center px-4 py-16 bg-cover bg-center gap-9"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.65)), url(${backgroundImage})`,
        }}
      >
        {/* Title */}
        <h1
          className="text-5xl md:text-6xl font-bold text-center tracking-wide "
          // style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          style={{ fontFamily: "'Uncial Antiqua', Georgia, serif" }}
        >
          Three Cock online
        </h1>

        {/* Subtitle */}
        <p
          className="text-center text-lg md:text-2xl max-w-2xl leading-relaxed text-gray-100"
          style={{ fontFamily: "Instrument Serif, serif" }}
          // style={{ fontFamily: "Georgia, serif" }}
        >
          3 Cock online - game full of battle and lies, where you see people
          true color when in the last moment
        </p>

        {/* Room ID + Join */}
           <JoinLobbyInput
            initialCode={code}
            onSubmit={joinLobby}
            className="w-full max-w-3xl flex items-stretch bg-white rounded-md overflow-hidden shadow-lg mb-12"
            inputClassName="flex-1 px-6 py-5 !text-black placeholder-gray-400 tracking-widest text-sm uppercase outline-none bg-transparent"
            buttonClassName="bg-black text-white font-bold px-10 uppercase tracking-wide hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:hover:bg-black disabled:cursor-not-allowed"
          />
        

        {/* Create room prompt */}
        <p
          className="text-center md:text-2xl mb-6"
          // style={{ fontFamily: "Georgia, serif" }}
          style={{ fontFamily: "Instrument Serif, serif" }}
        >
          Doesn't have a room yet? Create one below
        </p>

        <CreateLobbyButton
          onCreateLobby={createLobby}
          className="group border-2 border-white px-2 py-2 transition-transform duration-150 hover:scale-[1.03] active:scale-95 disabled:opacity-70 disabled:hover:scale-100"
          innerClassName="block bg-[#f9b658] text-white font-extrabold text-2xl tracking-wide px-16 py-4 transition-colors duration-150 group-hover:bg-[#ffc670]"
        />
      </main>
    </div>
  );
}