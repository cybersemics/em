/** An interface for platform-specific virtual keyboard handlers. */
interface VirtualKeyboardHandler {
  /** Initialize the handler and start listening for events. */
  init: () => void
  /** Clean up any event listeners. */
  destroy: () => void
  /** Opens the virtual keyboard for the given editable. Only implemented on platforms that do not open it automatically when the browser selection is set. Must be called before the selection is set. */
  show?: (editable: HTMLElement) => void
}

export default VirtualKeyboardHandler
