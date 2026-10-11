import { page } from '../session'

/**
 * Waits until the thoughtspace has committed every queued persistence write and applied every pending materialization
 * refresh. Persistence has no visual signal, so this is a sanctioned backdoor for synchronization only: call it before
 * a reload, or before asserting that a write landed, never as the assertion itself. The write barrier rejects if any
 * queued write failed, so an awaited call that resolves proves the writes were committed without an error.
 */
const waitForThoughtspaceIdle = async (): Promise<void> => {
  await page.evaluate(() => window.em.testHelpers.waitForThoughtspaceRuntimeIdle())
}

export default waitForThoughtspaceIdle
