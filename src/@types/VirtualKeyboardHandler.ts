/** An interface for platform-specific virtual keyboard handlers. */
interface VirtualKeyboardHandler {
  /** Initialize the handler and start listening for events. */
  init: () => void
  /** Clean up any event listeners. */
  destroy: () => void
  /** Opens the virtual keyboard. Only implemented on platforms that do not open it automatically when an editable is focused. */
  show?: () => void
}

export default VirtualKeyboardHandler
