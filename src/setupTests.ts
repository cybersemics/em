import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import * as matchers from 'jest-extended'
// requires jest config resetMocks: false after react-scripts v4
import { noop } from 'lodash'
import 'vi-canvas-mock'
import { registerReset, resetStores } from './stores/ministore'

expect.extend(matchers)

// add noop functions to prevent implementation error during test
window.blur = noop
window.scrollTo = noop

// jsdom does not implement matchMedia at all, so every consumer reads this stub. Report no match, which is what
// a headless test environment is: not a coarse pointer (browser.ts) and not an installed PWA (updateUrlHistory.ts).
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: noop,
    removeListener: noop,
    addEventListener: noop,
    removeEventListener: noop,
    dispatchEvent: () => false,
  })
}

document.execCommand = () => {
  console.warn('document.execCommand is not implemented in JSDOM')
  // execCommand returns false when the command is not supported, which is the honest result for a no-op stub.
  return false
}

const ResizeObserverMock = vi.fn(
  /** A no-op ResizeObserver, which jsdom does not implement. */
  class implements ResizeObserver {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)

vi.stubGlobal('ResizeObserver', ResizeObserverMock)

HTMLImageElement.prototype.decode = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

// jsdom does not implement Range.prototype.getClientRects, which getCaretOffset uses for glyph hit-testing.
// Return an empty list to match jsdom's zero-size layout, preventing "range.getClientRects is not a function" errors.
// DOMRectList is not constructible, so an array supplies the indexing and iteration and Object.assign adds the
// item() accessor it lacks.
if (typeof Range.prototype.getClientRects !== 'function') {
  Range.prototype.getClientRects = () => Object.assign([] as DOMRect[], { item: () => null })
}

// Likewise for getBoundingClientRect, which selection.caretRect uses to measure the caret. Reachable in jsdom
// only once an editable actually holds the focus, which is what useEditMode does when placing the caret.
if (typeof Range.prototype.getBoundingClientRect !== 'function') {
  Range.prototype.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  })
}

// jsdom swallows exceptions thrown inside DOM event listeners: it catches them and reports them as an
// `error` event on window instead of letting them propagate out of dispatchEvent. Vitest turns that event back
// into a run-failing unhandled error, but only while no other `error` listener is registered — and initEvents
// registers one at module scope for the error banner, so importing app code silently disables it and a test
// that crashes on every click still passes. Re-fail the run explicitly. Only trusted events are re-thrown, so
// tests that dispatch a synthetic ErrorEvent to exercise the banner (src/util/__tests__/initEvents.ts) are
// unaffected.
window.addEventListener('error', e => {
  if (!e.isTrusted || !e.error) return
  // Mark the event handled so jsdom does not additionally log it to the virtual console.
  e.preventDefault()
  process.emit('uncaughtException', e.error)
})

// stub jest globally. This is needed incase jest is being directly referenced in the code.
vi.stubGlobal('jest', vi)

// Cancel every lodash throttle and debounce at each test boundary (#5257). Vitest isolates modules per file, not per
// test, so a wrapper created at module scope outlives the test that scheduled its trailing call: the call fires into
// the next test, or into teardown after the store and localStorage have been cleared — which is where the intermittent
// `ReferenceError: localStorage is not defined` came from (#3345). Wrappers created inside a factory that runs once per
// file (pullQueue's, in the middleware chain) leak the same way, so the hook is at the source rather than at any call
// site: throttle and debounce are replaced with versions that record each wrapper they create, and registerReset
// cancels the live ones wherever resetStores runs — initStore and createTestApp at setup, cleanupTestApp before it
// drains timers, and the afterEach below. Cancelling goes through the wrapper rather than clearTimeout because lodash
// keeps its own timer id: a timer cleared behind its back leaves the wrapper believing one is pending, and the next
// test's first call is silently dropped. cancel() also reopens a leading-edge window, so the first call of the next
// test is not suppressed by a window the previous test opened. Weak references keep per-instance wrappers from
// pinning unmounted components for the rest of the file.
const { throttles } = vi.hoisted(() => ({ throttles: new Set<WeakRef<{ cancel: () => void }>>() }))

vi.mock(import('lodash'), async importOriginal => {
  const lodash = await importOriginal()

  /** Wraps throttle or debounce so that every wrapper it creates is registered for cancellation. */
  const registering = <T extends (...args: never[]) => { cancel: () => void }>(create: T): T =>
    ((...args: Parameters<T>) => {
      const wrapper = create(...args)
      throttles.add(new WeakRef(wrapper))
      return wrapper
    }) as T

  // lodash is CommonJS: the namespace's named exports are getters over the one lodash object that is also the default
  // export, so replacing the two methods on that object covers `_.throttle` and `import { throttle }` alike. The
  // namespace is returned as is, since spreading it would drop the getters.
  Object.assign(lodash.default, { throttle: registering(lodash.throttle), debounce: registering(lodash.debounce) })
  return lodash
})

registerReset(() => {
  throttles.forEach(ref => {
    const wrapper = ref.deref()
    if (wrapper) wrapper.cancel()
    else throttles.delete(ref)
  })
})

// Disable the Lottie icon animations, whose 5s repeating interval never runs out of pending timers: any test that
// mounts an animated icon (e.g. the Command Universe) would make cleanupTestApp's vi.runAllTimersAsync abort with
// "Aborting after running 100000 timers". Stubbing the hook keeps `animated` false, so LottieAnimation never mounts.
// Puppeteer tests are handled separately in LottieAnimation, which seeks the animation to its last frame.
// Passing the module import rather than its path is what ties the stub to the hook: it gives vi.mock the module
// type, so a field added to the hook's return value fails to compile here instead of reaching components as
// undefined. vi.mock does not evaluate the import; it is hoisted and resolved for its path like a string would be.
vi.mock(import('./hooks/useLottieIntervalAnimation'), () => ({
  /** Stubbed useLottieIntervalAnimation that never animates. */
  default: () => ({ isAnimated: false, onAnimationComplete: noop }),
}))

// React reports a state update that escaped act() with a console.error, and nothing turns that into a failure: the
// component goes on re-rendering outside React's control and the test still passes. A rendered test that dispatches
// outside act() is therefore invisible unless someone reads the console, which is how 2351 of these accumulated in
// two test files. Fail the test that emitted them instead. See docs/testing.md#3-jsdom-tests.
//
// The failure is raised in afterEach rather than thrown from console.error. React emits the warning from inside
// scheduleUpdateOnFiber, part-way through react-redux's notification of its subscribers; throwing there would abandon
// the remaining subscribers and cascade into failures that no longer point at the cause. Capturing the stack at the
// escape and reporting it afterwards names the same call site without unwinding React mid-update.
const actEscapes: { components: Set<string>; count: number; stack: string | null } = {
  components: new Set(),
  count: 0,
  stack: null,
}
const consoleErrorOriginal = console.error

console.error = (...args) => {
  // The warning is a format string; React passes the component name as the first substitution.
  if (typeof args[0] === 'string' && args[0].includes('was not wrapped in act(...)')) {
    actEscapes.count++
    actEscapes.components.add(args[1] || 'Unknown')
    // Capture one stack per test. Error.stackTraceLimit defaults to 10, which truncates well above the dispatch that
    // scheduled the update, and raising it is too expensive to do on every escape: one dispatch against the mounted
    // app warns once per subscribed component, so escapes arrive dozens at a time.
    if (!actEscapes.stack) {
      const stackTraceLimit = Error.stackTraceLimit
      Error.stackTraceLimit = 100
      actEscapes.stack = new Error().stack ?? null
      Error.stackTraceLimit = stackTraceLimit
    }
    return
  }
  consoleErrorOriginal(...args)
}

// Restore module-level state after every test: the ministores, and the state modules register with them (debugLog's
// buffer and frame heartbeat). Vitest isolates modules per file, not per test, so without this a test that enables
// debug logging leaks it into every later test in its file. initStore and createTestApp also reset at setup, but a
// plain unit test uses neither, and would otherwise have to hand-write the teardown. Only ministore is imported here,
// never the modules that register with it — see registerReset.
afterEach(resetStores)

afterEach(() => {
  if (!actEscapes.count) return

  const { count, stack } = actEscapes
  const components = Array.from(actEscapes.components).sort().join(', ')

  // Only this repo's own frames locate the offending call; the React and Redux frames between them are noise.
  const frames = (stack ?? '')
    .split('\n')
    .filter(line => line.includes('/src/') && !line.includes('/node_modules/') && !line.includes('/setupTests.'))
    .map(line => line.replace(`${process.cwd()}/`, ''))
  // The line to fix is in the test itself. Report it separately: the middleware chain that every dispatch passes
  // through sits above it and would otherwise crowd it out of the trace.
  const testFrame = frames.find(line => line.includes('__tests__'))
  const path = frames.filter(line => !line.includes('/redux-middleware/')).slice(0, 6)

  actEscapes.components = new Set()
  actEscapes.count = 0
  actEscapes.stack = null

  throw new Error(
    `${count} update${count === 1 ? '' : 's'} to ${components} escaped act() in this test.\n\n` +
      'Wrap whatever caused it in act(() => …): a store dispatch, a command execution, a focus() call, or a timer ' +
      'advance. See the JSDOM tests section of docs/testing.md.\n\n' +
      (testFrame ? `Escaped from:\n${testFrame}\n\n` : '') +
      `First escape:\n${path.join('\n')}`,
  )
})
