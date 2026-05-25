import type { LocalWriteOptions, MaterializationEvent } from '@treecrdt/interface/engine'

let pendingTreecrdtWrite = Promise.resolve()
let localWriteCounter = 0

const localWriteSourceId =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

const localWriteIdPrefix = `em-local:${localWriteSourceId}:`

/**
 * Queues em -> TreeCRDT persistence work and exposes an idle barrier for materialization refreshes.
 * This is a local ordering guard, not a CRDT requirement; it keeps Redux refreshes from racing local persistence.
 */
export function withTreecrdtWriteBarrier<T>(work: () => Promise<T>): Promise<T> {
  const run = pendingTreecrdtWrite.then(work, work)
  pendingTreecrdtWrite = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

/** Waits until TreeCRDT persistence is idle, including work queued while waiting. */
export async function waitForTreecrdtWriteBarrier(): Promise<void> {
  let pending: Promise<void>
  do {
    pending = pendingTreecrdtWrite
    await pending
  } while (pending !== pendingTreecrdtWrite)
}

/** Creates local write metadata used to identify materialization events already applied optimistically in Redux. */
export function createTreecrdtLocalWriteOptions(): LocalWriteOptions {
  localWriteCounter += 1
  return { writeId: `${localWriteIdPrefix}${localWriteCounter}` }
}

/** True when a materialization event was produced by this tab's own optimistic TreeCRDT write. */
export const isTreecrdtLocalMaterialization = (event: MaterializationEvent): boolean => {
  return (
    event.changes.length > 0 &&
    event.changes.every(change => {
      const writeIds = change.source?.writeIds
      return !!writeIds?.length && writeIds.every(writeId => writeId.startsWith(localWriteIdPrefix))
    })
  )
}

export default {
  createTreecrdtLocalWriteOptions,
  isTreecrdtLocalMaterialization,
  waitForTreecrdtWriteBarrier,
  withTreecrdtWriteBarrier,
}
