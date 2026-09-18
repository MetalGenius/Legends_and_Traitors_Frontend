import backgroundImage from "@assets/images/homescreen.avif";
import CreateLobbyButton from "@shared/components/ui/CreateLobbyButton.tsx";
import JoinLobbyInput from "@shared/components/ui/JoinLobbyInput.tsx";
import { useCreateLobby, useJoinLobby } from "@features/lobby";

export default function ThreeCockOnlineLanding() {
  const { createLobby, isCreating, error: createLobbyError } = useCreateLobby();
  const { joinLobby } = useJoinLobby();

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col">
      {/* Top nav bar */}
      <header className="w-full bg-[#1a1a1a] px-8 py-5 flex items-center justify-end gap-6">
        <div className="flex items-center gap-6">
          <button className="joti-one-regular cursor-pointer text-sm text-gray-200 hover:underline">
            Sign in
          </button>
          <button className="joti-one-regular cursor-pointer bg-white !text-black text-sm px-6 py-2 rounded-sm hover:underline">
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
          Legend and Traitor
        </h1>

        {/* Subtitle */}
        <p
          className="text-center text-lg md:text-2xl max-w-2xl leading-relaxed text-gray-100"
          style={{ fontFamily: "Instrument Serif, serif" }}
          // style={{ fontFamily: "Georgia, serif" }}
        >
          Legend and Traitor - game full of battle and lies, where you see people
          true color when in the last moment
        </p>

        {/* Room ID + Join */}
           <JoinLobbyInput
            onSubmit={joinLobby}
            className="w-full max-w-3xl flex items-stretch bg-white rounded-md overflow-hidden shadow-lg mb-12"
            inputClassName="flex-1 px-6 py-5 !text-black placeholder-gray-400 placeholder:font-['Joti_One'] tracking-widest text-sm uppercase outline-none bg-transparent"
            buttonClassName="joti-one-regular cursor-pointer bg-black text-white px-9 py-4 rounded m-2 uppercase tracking-wide hover:bg-[#666666] transition-colors"
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
          disabled={isCreating}
          className="group cursor-pointer border-2 border-white px-2 py-2"
          innerClassName="joti-one-regular block bg-[#f9b658] text-white text-2xl tracking-wide px-16 py-4 transition-colors duration-150 group-hover:bg-white group-hover:!text-black"
        />

        {createLobbyError && (
          <p className="text-red-400 text-sm mt-3" role="alert">
            {createLobbyError}
          </p>
        )}
      </main>
    </div>
  );
}