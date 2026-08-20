/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FEEDBACK_URL: string
  readonly VITE_WEBSOCKET_HOST: string
  readonly VITE_WEBSOCKET_PORT: number
  readonly VITE_AI_URL: string
  readonly VITE_TREECRDT_SYNC_BASE_URL?: string
  /** When truthy, enables the console proxy in src/util/consoleProxy.ts. Set for BrowserStack CI runs and AI agents that use the WDIO MCP; unset for production. The flag must be set at both build-time and run-time. */
  readonly VITE_BROWSER_CONSOLE_CAPTURE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Short git commit hash of the current build, injected at build time via Vite's `define` in vite.config.ts. */
declare const __COMMIT_HASH__: string
