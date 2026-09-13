import { useState, useEffect, useCallback } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

interface JoinLobbyInputProps {
  /**
   * Pre-filled code, typically read from the /join/:code URL param.
   * When present and valid (6 letters), the manual-entry step is skipped
   * and onSubmit fires automatically on mount.
   */
  initialCode?: string;
  /**
   * Called with the sanitized 6-character code once submitted — either by
   * clicking the button (manual path) or automatically (URL path).
   * The actual join API call lives in Task #41; this is just a hook.
   */
  onSubmit: (code: string) => void;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
}

const CODE_LENGTH = 6;

/** Uppercase, strip anything that isn't A-Z, and cap at 6 chars. */
function sanitizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, CODE_LENGTH);
}

export default function JoinLobbyInput({
  initialCode = "",
  onSubmit,
  className = "",
  inputClassName = "",
  buttonClassName = "",
}: JoinLobbyInputProps) {
  const [codeInput, setCodeInput] = useState(() => sanitizeCode(initialCode));

  const isValid = codeInput.length === CODE_LENGTH;

  const handleSubmit = useCallback(() => {
    if (!isValid) return;
    onSubmit(codeInput);
  }, [isValid, codeInput, onSubmit]);

  // URL-based auto-join: if we arrived with a valid code already (e.g. from
  // /join/:code), skip the manual input step entirely and submit right away.
  useEffect(() => {
    const sanitized = sanitizeCode(initialCode);
    if (sanitized.length === CODE_LENGTH) {
      setCodeInput(sanitized);
      onSubmit(sanitized);
    }
    // Only run this on mount / when initialCode changes — not on every
    // manual keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Handles both typing and pasting — a pasted lowercase/mixed-case code
    // goes through the same sanitize() call, so it normalizes automatically.
    setCodeInput(sanitizeCode(e.target.value));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className={className}>
      <input
        type="text"
        value={codeInput}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="LOBBY CODE"
        maxLength={CODE_LENGTH}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        data-testid="join-lobby-input"
        className={inputClassName}
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid}
        data-testid="join-lobby-submit"
        className={buttonClassName}
      >
        Join
      </button>
    </div>
  );
}