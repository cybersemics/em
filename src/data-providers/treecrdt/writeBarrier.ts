let pendingTreecrdtWrite = Promise.resolve()
let localTreecrdtWriteDepth = 0

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

/** Runs a TreeCRDT local write while marking same-tab materialization events as already applied optimistically. */
export async function withTreecrdtLocalWrite<T>(work: () => Promise<T>): Promise<T> {
  localTreecrdtWriteDepth += 1
  try {
    return await work()
  } finally {
    localTreecrdtWriteDepth -= 1
  }
}

/** True while this tab is applying an optimistic local write to TreeCRDT. */
export const isTreecrdtLocalWriteInProgress = (): boolean => localTreecrdtWriteDepth > 0

export default {
  isTreecrdtLocalWriteInProgress,
  waitForTreecrdtWriteBarrier,
  withTreecrdtLocalWrite,
  withTreecrdtWriteBarrier,
}
