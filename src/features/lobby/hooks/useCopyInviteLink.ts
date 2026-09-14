import { useState } from "react";

export function useCopyInviteLink(inviteLink: string) {
  const [copied, setCopied] = useState(false);

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may be unavailable — fail silently for now.
    }
  };

  return { copied, copyInviteLink };
}
