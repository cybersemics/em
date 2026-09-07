/* eslint-disable import/prefer-default-export -- small config module */
/** Sync bootstrap or direct WebSocket URL (`ws://`, `wss://`, or `http(s)://` discovery). Set via Vite: `VITE_TREECRDT_SYNC_BASE_URL`. */
export function getTreecrdtSyncBaseUrl(): string | undefined {
  const raw = import.meta.env.VITE_TREECRDT_SYNC_BASE_URL
  if (raw == null || typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  return trimmed === '' ? undefined : trimmed
}
