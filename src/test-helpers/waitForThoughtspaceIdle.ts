import { thoughtspaceRuntime } from '../data-providers/thoughtspace'
import syncStatusStore from '../stores/syncStatus'

/** True when all thoughtspace pulls visible to app tests have drained. */
const isThoughtspacePullingSettled = (): boolean => {
  const { isPulling, isBackgroundPulling } = syncStatusStore.getState()
  return !isPulling && !isBackgroundPulling
}

/** Waits for real TreeCRDT persistence and pull queue work used by unit tests. */
const waitForThoughtspaceIdle = async (): Promise<void> => {
  for (let i = 0; i < 3; i++) {
    await thoughtspaceRuntime.waitForIdle()

    if (!isThoughtspacePullingSettled()) {
      await syncStatusStore.once(isThoughtspacePullingSettled)
    }

    await thoughtspaceRuntime.waitForIdle()
  }
}

export default waitForThoughtspaceIdle
