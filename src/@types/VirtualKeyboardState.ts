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
}
