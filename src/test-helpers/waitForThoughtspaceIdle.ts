import { thoughtspaceRuntime } from '../data-providers/thoughtspace'
import commandThoughtspace from './commandThoughtspace'

/** Waits for accepted live-editor and isolated-fixture writes to finish persistence. */
const waitForThoughtspaceIdle = async (): Promise<void> => {
  await Promise.all([thoughtspaceRuntime.waitForIdle(), commandThoughtspace.waitForIdle()])
}

export default waitForThoughtspaceIdle
