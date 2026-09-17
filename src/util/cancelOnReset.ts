/** A throttled or debounced function, or anything else with a pending call that can be cancelled. */
interface Cancellable {
  cancel: () => void
}

/** Every wrapper registered by cancelOnReset. Module-scope wrappers are singletons, so the set does not grow at runtime. */
const registered = new Set<Cancellable>()

/**
 * Registers a module-scope throttle or debounce so that its pending trailing call is cancelled at test boundaries, and
 * returns it unchanged so it can wrap the lodash call inline.
 *
 * Vitest isolates modules per file, not per test, so a wrapper created at module scope outlives the test that scheduled
 * its trailing call: the call fires into the next test, or into teardown after the store and localStorage have been
 * cleared. Registering the wrapper lets resetStores, cleanupTestApp, and the global afterEach in setupTests cancel it
 * (see cancelOnReset.cancelAll). Cancelling also resets a leading-edge throttle's window, so the next test's first call
 * is not suppressed by a window the previous test opened. Wrappers created inside functions and components are
 * per-instance and do not need this.
 */
const cancelOnReset = <T extends Cancellable>(wrapper: T): T => {
  registered.add(wrapper)
  return wrapper
}

/** Cancels the pending call of every registered wrapper. Called at test boundaries; nothing in the app calls it. */
cancelOnReset.cancelAll = () => {
  registered.forEach(wrapper => wrapper.cancel())
}

export default cancelOnReset
