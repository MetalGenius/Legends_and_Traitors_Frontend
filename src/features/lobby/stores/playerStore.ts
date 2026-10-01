import { create } from 'zustand'

/** The current player as the lobby knows them - set once they've joined. */
interface PlayerStore {
  displayName: string | null
  setDisplayName: (displayName: string) => void
  clearPlayer: () => void
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  displayName: null,
  setDisplayName: (displayName) => set({ displayName }),
  clearPlayer: () => set({ displayName: null }),
}))
