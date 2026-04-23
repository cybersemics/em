/** An interface for platform-specific virtual keyboard handlers. */
interface VirtualKeyboardHandler {
  /** Initialize the handler and start listening for events. */
  init: () => void
  /** Clean up any event listeners. */
  destroy: () => void
}

export default VirtualKeyboardHandler
