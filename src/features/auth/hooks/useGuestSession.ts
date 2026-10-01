import { useEffect } from "react";

import { createGuest } from "@features/auth/api/authService";
import {
  trackPendingSession,
  useSessionStore,
  type SessionAccount,
} from "@shared/lib/session";

// Shared by every caller so StrictMode's double effect, or two components
// mounting at once, still mint only one guest.
let guestRequest: Promise<SessionAccount> | null = null;

/**
 * Resolves to the current account, creating a guest one first if there's no
 * token yet (the player hasn't logged in and has never been here before).
 */
export function ensureGuestSession(): Promise<SessionAccount> {
  const { token, account } = useSessionStore.getState();
  if (token && account) return Promise.resolve(account);

  if (!guestRequest) {
    const request = createGuest()
      .then(({ token: guestToken, user }) => {
        const guest: SessionAccount = { ...user, isGuest: true };
        useSessionStore.getState().setSession(guestToken, guest);
        return guest;
      })
      .finally(() => {
        guestRequest = null;
      });
    guestRequest = request;
    trackPendingSession(request);
  }
  return guestRequest;
}

/**
 * Makes sure there's a session for the app to act as, and returns its
 * account (null until the guest request lands). A failed guest request is
 * left for the next mount to retry - lobby calls made meanwhile fail with
 * their own error messages.
 */
export function useGuestSession() {
  const account = useSessionStore((state) => state.account);

  useEffect(() => {
    ensureGuestSession().catch(() => {});
  }, []);

  return { account };
}
