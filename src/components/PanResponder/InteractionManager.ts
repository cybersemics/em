/**
 * Simple InteractionManager implementation for PanResponder.
 * Used to block long-running JS events from interrupting active gestures.
 */

let interactionCount = 0
const interactionHandles: Set<number> = new Set()

const InteractionManager = {
  createInteractionHandle(): number {
    interactionCount++
    const handle = interactionCount
    interactionHandles.add(handle)
    return handle
  },

  clearInteractionHandle(handle: number): void {
    interactionHandles.delete(handle)
  },

  /**
   * Schedule a function to run after all interactions have completed.
   * For simplicity, we just use setTimeout with a small delay.
   */
  runAfterInteractions(callback: () => void): void {
    setTimeout(callback, 0)
  },
}

export default InteractionManager
