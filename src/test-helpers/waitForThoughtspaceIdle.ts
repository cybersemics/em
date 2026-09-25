import { thoughtspaceRuntime } from '../data-providers/thoughtspace'

/** Waits for accepted document writes to finish persistence. */
const waitForThoughtspaceIdle = (): Promise<void> => thoughtspaceRuntime.waitForIdle()

export default waitForThoughtspaceIdle
