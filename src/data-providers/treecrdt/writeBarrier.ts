import type { LocalWriteOptions, MaterializationEvent } from '@treecrdt/interface/engine'

let pendingTreecrdtWrite = Promise.resolve()
let pendingTreecrdtWriteError: unknown = null
let localWriteCounter = 0

const localWriteSourceId =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

const localWriteIdPrefix = `em-local:${localWriteSourceId}:`

/**
 * Serializes provider reads, local/incoming writes, and committed publication.
 * Internal client/index calls must not re-enter this queue or wait for its idle barrier.
 */
export function withTreecrdtWriteBarrier<T>(work: () => Promise<T>): Promise<T> {
  const run = pendingTreecrdtWrite.then(work, work)
  pendingTreecrdtWrite = run.then(
    () => undefined,
    err => {
      pendingTreecrdtWriteError = err
    },
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

  if (pendingTreecrdtWriteError) {
    const err = pendingTreecrdtWriteError
    pendingTreecrdtWriteError = null
    throw err
  }
}

/** Namespaces app write IDs to this tab, with unique IDs for bootstrap/provider-only writes. */
export function createTreecrdtLocalWriteOptions(writeId?: string): LocalWriteOptions {
  localWriteCounter += 1
  return { writeId: `${localWriteIdPrefix}${writeId ?? localWriteCounter}` }
}

/** Recognizes obsolete Redux write IDs before they are namespaced for the TreeCRDT client. */
export const isStaleThoughtWrite = (id: string, generation: number): boolean =>
  id.startsWith('generation:') && !id.startsWith(`generation:${generation}:`)

/** True when every change belongs to this tab's writes from a cleared Redux generation. */
export const isStaleTreecrdtMaterialization = (event: MaterializationEvent, generation: number): boolean =>
  event.changes.length > 0 &&
  event.changes.every(change =>
    change.source?.writeIds?.length
      ? change.source.writeIds.every(
          id =>
            id.startsWith(localWriteIdPrefix) && isStaleThoughtWrite(id.slice(localWriteIdPrefix.length), generation),
        )
      : false,
  )

export default {
  createTreecrdtLocalWriteOptions,
  isStaleTreecrdtMaterialization,
  waitForTreecrdtWriteBarrier,
  withTreecrdtWriteBarrier,
}
