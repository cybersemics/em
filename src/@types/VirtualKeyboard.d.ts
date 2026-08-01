/** Ambient typings for the Chromium VirtualKeyboard API, which is not yet part of TypeScript's lib.dom.
 *
 * See: https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API.
 */
interface VirtualKeyboard extends EventTarget {
  /** The rectangle occluded by the virtual keyboard, whose height is 0 when the keyboard is hidden. */
  readonly boundingRect: DOMRectReadOnly
  /** When true, the keyboard overlays content (rather than resizing the viewport) and geometrychange events fire. */
  overlaysContent: boolean
  show: () => void
  hide: () => void
}

interface Navigator {
  readonly virtualKeyboard: VirtualKeyboard
}
