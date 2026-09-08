/** The state of the virtual keyboard. */
export default interface VirtualKeyboardState {
  /** True if the virtual keyboard is open. */
  open: boolean
  /** The height of the virtual keyboard in pixels. */
  height: number
  /** The final height that the virtual keyboard is animating toward. */
  targetHeight: number
}
