import { registerPlugin } from '@capacitor/core'

/** Diagnostic access to UIKit's actual animation; normal keyboard handling never invokes it. */
const IOSKeyboardPlugin = registerPlugin<{
  /** Arms measurement of the next keyboard show or hide, then releases all native resources. */
  measure: () => Promise<{
    durationMs: number
    speed: number
    /** Omitted when Core Animation uses its default linear timing. */
    bezier?: [number, number, number, number]
    spring?: { mass: number; stiffness: number; damping: number; velocity: number }
  }>
  /** Cancels a pending measurement, rejecting its promise and releasing its resources. */
  cancelMeasurement: () => Promise<void>
}>('IOSKeyboardPlugin')

export default IOSKeyboardPlugin
