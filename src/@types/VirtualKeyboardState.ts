/** The state of the virtual keyboard. */
export default interface VirtualKeyboardState {
  /** True if the virtual keyboard is open. */
  open: boolean
  /** The height of the virtual keyboard in pixels. */
  height: number
  /** Native lifecycle phase, when the platform provides it. Editor behavior observes this separately from geometry. */
  phase?: 'opening' | 'open' | 'closing' | 'closed'
}
