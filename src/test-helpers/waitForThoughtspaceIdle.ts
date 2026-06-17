import { thoughtspaceRuntime } from '../data-providers/thoughtspace'
import syncStatusStore from '../stores/syncStatus'

/** Waits for real TreeCRDT persistence and pull queue work used by unit tests. */
const waitForThoughtspaceIdle = async (): Promise<void> => {
  for (let i = 0; i < 3; i++) {
    await thoughtspaceRuntime.waitForIdle()

    if (syncStatusStore.getState().isPulling) {
      await syncStatusStore.once(state => !state.isPulling)
    }

    await thoughtspaceRuntime.waitForIdle()
  }
}

export default waitForThoughtspaceIdle
