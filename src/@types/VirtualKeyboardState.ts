/** The state of the virtual keyboard. */
export default interface VirtualKeyboardState {
  /** True if the virtual keyboard is open. */
  open: boolean
  /** The height of the virtual keyboard in pixels. Spring-animated while the keyboard slides, for UI that rides the keyboard (see usePositionFixed). */
  height: number
  /** The height the keyboard is animating toward — its final height, known as soon as it starts moving. Changes once per keyboard event (open, close, resize), so subscribe to this slice to react to keyboard events without firing on every animation frame. On iOS Safari, where the final height cannot be measured until the keyboard settles, this is a predicted final height learned from the previous open (see iOSSafariHandler). */
  targetHeight: number
}
