import type { Operation } from '@treecrdt/interface'
import { type TreecrdtWebSocketSync, connectTreecrdtWebSocketSync } from '@treecrdt/sync'
import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import { getTreecrdtSyncBaseUrl } from './config'

/** Creates WebSocket sync state owned by one TreeCRDT thoughtspace and document. */
export const createTreecrdtWebSocketSync = () => {
  let syncHandle: TreecrdtWebSocketSync | null = null
  let pendingLocalOps: Operation[] = []

  /** Closes the current WebSocket without discarding writes waiting for the next connection. */
  const closeHandle = async (): Promise<void> => {
    if (syncHandle) {
      await syncHandle.close()
      syncHandle = null
    }
  }

  /** Stops live sync, closes the WebSocket, and discards writes owned by this ending session. */
  const stop = async (): Promise<void> => {
    pendingLocalOps = []
    await closeHandle()
  }

  /** Uploads local ops that were produced before this thoughtspace's WebSocket handle was ready. */
  const flushPendingLocalOps = async (): Promise<void> => {
    if (!syncHandle || pendingLocalOps.length === 0) return

    const ops = pendingLocalOps
    pendingLocalOps = []
    try {
      await syncHandle.pushLocalOps(ops)
    } catch (err) {
      pendingLocalOps = [...ops, ...pendingLocalOps]
      console.warn('TreeCRDT pushLocalOps failed', err)
    }
  }

  /** Connects to the sync server, runs catch-up, then live subscription. No-op if no base URL. */
  const start = async (client: TreecrdtClient): Promise<void> => {
    const baseUrl = getTreecrdtSyncBaseUrl()
    if (!baseUrl) return

    await closeHandle()

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
    await flushPendingLocalOps()
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

  /** Uploads local edits through this thoughtspace's handle, or buffers them until that handle is ready. */
  const pushLocalOps = async (ops: readonly Operation[]): Promise<void> => {
    if (ops.length === 0) return
    if (!syncHandle) {
      if (getTreecrdtSyncBaseUrl()) pendingLocalOps.push(...ops)
      return
    }
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
