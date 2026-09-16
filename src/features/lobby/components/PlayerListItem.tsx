import { Crown } from "lucide-react";

interface PlayerListItemProps {
  name: string;
  isHost?: boolean;
}

export default function PlayerListItem({ name, isHost = false }: PlayerListItemProps) {
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <div className="relative w-56 rounded-xl border-4 border-[#e0a548] bg-[#d9d9d9] overflow-hidden transition-transform duration-150 hover:scale-[1.03]">
      {isHost && (
        <Crown
          className="absolute top-2 right-2 text-yellow-400 fill-yellow-400"
          size={24}
        />
      )}
      <div className="h-44 bg-[#9c9c9c] flex items-center justify-center text-5xl font-bold text-white">
        {initial}
      </div>
      <p className="text-center text-black py-3 text-base">{name}</p>
    </div>
  );
}
