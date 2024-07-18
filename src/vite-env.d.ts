/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FEEDBACK_URL: string
  readonly VITE_WEBSOCKET_HOST: string
  readonly VITE_WEBSOCKET_PORT: number
  readonly VITE_AI_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
