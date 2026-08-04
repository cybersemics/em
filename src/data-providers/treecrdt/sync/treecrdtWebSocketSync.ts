import type { Operation } from '@treecrdt/interface'
import { type TreecrdtWebSocketSync, connectTreecrdtWebSocketSync } from '@treecrdt/sync'
import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import { getTreecrdtSyncBaseUrl } from './config'

/** Creates WebSocket sync state owned by one TreeCRDT thoughtspace and document. */
const createTreecrdtWebSocketSync = () => {
  let syncHandle: TreecrdtWebSocketSync | null = null

  /** Stops live sync and closes this thoughtspace's WebSocket. */
  const stop = async (): Promise<void> => {
    if (syncHandle) {
      await syncHandle.close()
      syncHandle = null
    }
  }

  /** Connects to the sync server, runs catch-up, then live subscription. No-op if no base URL. */
  const start = async (client: TreecrdtClient): Promise<void> => {
    const baseUrl = getTreecrdtSyncBaseUrl()
    if (!baseUrl) return

    await stop()

    const handle = await connectTreecrdtWebSocketSync(client, {
      baseUrl,
      fetch,
      onLiveError: err => {
        console.error('TreeCRDT WebSocket sync live subscription error', err)
      },
    })

    try {
      await handle.syncOnce()
      await handle.startLive()
    } catch (err) {
      await handle.close()
      throw err
    }

    syncHandle = handle
  }

  /** Starts sync when `VITE_TREECRDT_SYNC_BASE_URL` is set; skips in test; logs warnings on failure. */
  const tryStartFromEnv = async (client: TreecrdtClient): Promise<void> => {
    if (import.meta.env.MODE === 'test') return
    if (!getTreecrdtSyncBaseUrl()) return
    try {
      await start(client)
    } catch (err) {
      console.warn('TreeCRDT WebSocket sync failed to start', err)
    }
  }

  /** Uploads local edits through this thoughtspace's active WebSocket handle. */
  const pushLocalOps = async (ops: readonly Operation[]): Promise<void> => {
    if (ops.length === 0 || !syncHandle) return
    try {
      await syncHandle.pushLocalOps(ops)
    } catch (err) {
      console.warn('TreeCRDT pushLocalOps failed', err)
    }
  }

  return {
    pushLocalOps,
    start,
    stop,
    tryStartFromEnv,
  }
}

export default createTreecrdtWebSocketSync
