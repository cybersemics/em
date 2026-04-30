import type { Operation } from '@treecrdt/interface'
import type { MaterializationEvent } from '@treecrdt/interface/engine'
import { type TreecrdtWebSocketSync, connectTreecrdtWebSocketSync } from '@treecrdt/sync'
import type { TreecrdtClient } from '@treecrdt/wa-sqlite/client'
import type Thought from '../../../@types/Thought'
import { registerBeforeTreecrdtClose } from '../treecrdt'
import { applyMaterializedThoughtsToStore } from './applyMaterializedThoughtsToStore'
import { getTreecrdtSyncBaseUrl } from './config'

let syncHandle: TreecrdtWebSocketSync | null = null
let removeCloseHook: (() => void) | null = null
let materializedUnsub: (() => void) | null = null

export type TreecrdtWebSocketSyncOptions = {
  /** Called for each non-deleted thought after remote materialization; use to update Redux (e.g. pending flags). */
  onThoughtChange?: (thought: Thought) => void
}

/** Stops live sync and closes the WebSocket. Idempotent. */
export async function stopTreecrdtWebSocketSync(): Promise<void> {
  materializedUnsub?.()
  materializedUnsub = null
  removeCloseHook?.()
  removeCloseHook = null
  if (syncHandle) {
    await syncHandle.close()
    syncHandle = null
  }
}

/** Connects to the sync server, runs catch-up, then live subscription. No-op if no base URL. */
export async function startTreecrdtWebSocketSync(
  client: TreecrdtClient,
  options?: TreecrdtWebSocketSyncOptions,
): Promise<void> {
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

  const onThoughtChange = options?.onThoughtChange
  if (onThoughtChange) {
    materializedUnsub = handle.onChange((event: MaterializationEvent) => {
      void applyMaterializedThoughtsToStore(event, onThoughtChange).catch(err =>
        console.error('TreeCRDT materialized UI sync failed', err),
      )
    })
  }

  syncHandle = handle
  removeCloseHook = registerBeforeTreecrdtClose(async () => {
    removeCloseHook?.()
    removeCloseHook = null
    materializedUnsub?.()
    materializedUnsub = null
    if (syncHandle) {
      await syncHandle.close()
      syncHandle = null
    }
  })
}

/** Starts sync when `VITE_TREECRDT_SYNC_BASE_URL` is set; skips in test; logs warnings on failure. */
export async function tryStartTreecrdtWebSocketSyncFromEnv(
  client: TreecrdtClient,
  options?: TreecrdtWebSocketSyncOptions,
): Promise<void> {
  if (import.meta.env.MODE === 'test') return
  if (!getTreecrdtSyncBaseUrl()) return
  try {
    await startTreecrdtWebSocketSync(client, options)
  } catch (err) {
    console.warn('TreeCRDT WebSocket sync failed to start', err)
  }
}

/** Upload TreeCRDT ops produced by local edits to the remote peer when WebSocket sync is active. */
export async function pushTreecrdtLocalOpsToRemote(ops: readonly Operation[]): Promise<void> {
  if (!syncHandle || ops.length === 0) return
  try {
    await syncHandle.pushLocalOps(ops)
  } catch (err) {
    console.warn('TreeCRDT pushLocalOps failed', err)
  }
}
