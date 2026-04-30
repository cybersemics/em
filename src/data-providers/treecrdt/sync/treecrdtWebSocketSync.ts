/* eslint-disable import/prefer-default-export -- named lifecycle API */
import { type TreecrdtWebSocketSync, connectTreecrdtWebSocketSync } from '@treecrdt/sync'
import type { TreecrdtClient } from '@treecrdt/wa-sqlite/client'
import { registerBeforeTreecrdtClose } from '../treecrdt'
import { getTreecrdtSyncBaseUrl } from './config'

let syncHandle: TreecrdtWebSocketSync | null = null
let removeCloseHook: (() => void) | null = null

/** Stops live sync and closes the WebSocket. Idempotent. */
export async function stopTreecrdtWebSocketSync(): Promise<void> {
  removeCloseHook?.()
  removeCloseHook = null
  if (syncHandle) {
    await syncHandle.close()
    syncHandle = null
  }
}

/** Connects to the sync server, runs catch-up, then live subscription. No-op if no base URL. */
export async function startTreecrdtWebSocketSync(client: TreecrdtClient): Promise<void> {
  const baseUrl = getTreecrdtSyncBaseUrl()
  if (!baseUrl) return

  await stopTreecrdtWebSocketSync()

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
  removeCloseHook = registerBeforeTreecrdtClose(async () => {
    removeCloseHook?.()
    removeCloseHook = null
    if (syncHandle) {
      await syncHandle.close()
      syncHandle = null
    }
  })
}

/** Starts sync when `VITE_TREECRDT_SYNC_BASE_URL` is set; skips in test; logs warnings on failure. */
export async function tryStartTreecrdtWebSocketSyncFromEnv(client: TreecrdtClient): Promise<void> {
  if (import.meta.env.MODE === 'test') return
  if (!getTreecrdtSyncBaseUrl()) return
  try {
    await startTreecrdtWebSocketSync(client)
  } catch (err) {
    console.warn('TreeCRDT WebSocket sync failed to start', err)
  }
}
