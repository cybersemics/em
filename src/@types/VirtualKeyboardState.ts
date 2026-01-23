/** The state of the virtual keyboard. */
export default interface VirtualKeyboardState {
  /** True if the virtual keyboard is open. */
  open: boolean
  /** The height of the virtual keyboard in pixels. */
  height: number
  /** The source of the virtual keyboard state. */
  source?: 'ios-capacitor' | 'ios-safari' | 'android-capacitor' | 'android-chrome'
}
