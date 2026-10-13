/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Real-time server URL. Defaults to /ws on the app's own host. */
  readonly VITE_WS_URL?: string
}
