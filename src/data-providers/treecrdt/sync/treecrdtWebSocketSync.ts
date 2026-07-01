/* eslint-disable import/prefer-default-export -- sync module exposes lifecycle functions */
import type { Operation } from '@treecrdt/interface'
import { type TreecrdtWebSocketSync, connectTreecrdtWebSocketSync } from '@treecrdt/sync'
import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import { registerBeforeTreecrdtClose } from '../treecrdt'
import { getTreecrdtSyncBaseUrl } from './config'

let syncHandle: TreecrdtWebSocketSync | null = null
let removeCloseHook: (() => void) | null = null
let pendingLocalOps: Operation[] = []

/** Stops live sync and closes the WebSocket. Idempotent. */
export async function stopTreecrdtWebSocketSync(): Promise<void> {
  removeCloseHook?.()
  removeCloseHook = null
  pendingLocalOps = []
  if (syncHandle) {
    await syncHandle.close()
    syncHandle = null
  }
}

/** Uploads local ops that were produced before the WebSocket sync handle was ready. */
async function flushPendingLocalOps(): Promise<void> {
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
  await flushPendingLocalOps()
  removeCloseHook = registerBeforeTreecrdtClose(async () => {
    removeCloseHook?.()
    removeCloseHook = null
    pendingLocalOps = []
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

/** Upload TreeCRDT ops produced by local edits to the remote peer when WebSocket sync is active. */
export async function pushTreecrdtLocalOpsToRemote(ops: readonly Operation[]): Promise<void> {
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
