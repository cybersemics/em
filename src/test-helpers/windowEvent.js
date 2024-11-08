/** Dispatches an event on the window object. */
const windowEvent = (...args) => window.dispatchEvent(new KeyboardEvent(...args))

export default windowEvent
