/** The state of the virtual keyboard. */
export default interface VirtualKeyboardState {
  /** True if the virtual keyboard is open. */
  open: boolean
  /** The height of the virtual keyboard in pixels. */
  height: number
  /** A float between 0 and 1 representing how open the keyboard is. Derived from the animated height relative to the target keyboard height. Updated on every spring frame. */
  openPercent: number
  /** Native lifecycle phase, when the platform provides it. Editor behavior observes this separately from geometry. */
  phase?: 'opening' | 'open' | 'closing' | 'closed'
  /** Optional timed geometry for renderers that can follow the keyboard independently of JavaScript frames. */
  motion?: {
    /** Native transition start on the same wall clock as Date.now(), in milliseconds. */
    startedAt: number
    /** Duration in milliseconds. */
    duration: number
    /** Normalized keyboard heights sampled at evenly spaced fractions of the transition. */
    heights: readonly number[]
  }
}
