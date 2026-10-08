/**
 * Game rules every lobby shares. Not chosen per lobby or sent by the server:
 * the UI reads these directly. The backend must enforce the same values.
 */

/** Seats in every lobby, host included. */
export const MAX_PLAYERS = 8

/** Fewest players a game can start with. The host needn't wait for a full lobby. */
export const MIN_PLAYERS = 4
