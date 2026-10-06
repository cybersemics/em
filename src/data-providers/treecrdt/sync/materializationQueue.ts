import { registerReset } from '../../../stores/ministore'

let materializedThoughtsToStoreQueue = Promise.resolve()
let materializedThoughtsToStoreError: unknown = null
let materializedThoughtsToStoreVersion = 0

/** Incremented at every test boundary, so that a failure is recorded only if its refresh was queued since the last one. Constant outside tests. */
let materializedThoughtsToStoreGeneration = 0

// Discard a failure that no one waited for at the test boundary, and any failure still in flight from work queued
// before it, so that it is not thrown at whichever later test waits for idle next. The queue itself is left alone:
// replacing it would detach a refresh that is still running, and initStore's wait for idle must still await it.
registerReset(() => {
  materializedThoughtsToStoreError = null
  materializedThoughtsToStoreGeneration += 1
})

/** Serializes materialization refresh work and records failures for the idle barrier. */
export function enqueueMaterializedThoughtsToStoreWork(work: () => Promise<void>): Promise<void> {
  materializedThoughtsToStoreVersion += 1
  const generation = materializedThoughtsToStoreGeneration
  const apply = materializedThoughtsToStoreQueue.then(work)
  materializedThoughtsToStoreQueue = apply.catch(err => {
    if (generation === materializedThoughtsToStoreGeneration) materializedThoughtsToStoreError = err
  })
  return apply
}

/** Monotonically increases whenever materialization refresh work is queued. */
export const getMaterializedThoughtsToStoreVersion = (): number => materializedThoughtsToStoreVersion

/** Waits for queued materialization refreshes to finish and surfaces the first refresh error. */
export async function waitForMaterializedThoughtsToStore(): Promise<void> {
  let pending: Promise<void>
  do {
    pending = materializedThoughtsToStoreQueue
    await pending
  } while (pending !== materializedThoughtsToStoreQueue)

  if (materializedThoughtsToStoreError) {
    const err = materializedThoughtsToStoreError
    materializedThoughtsToStoreError = null
    throw err
  }
}

export default {
  enqueueMaterializedThoughtsToStoreWork,
  getMaterializedThoughtsToStoreVersion,
  waitForMaterializedThoughtsToStore,
}
