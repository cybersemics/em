import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import * as matchers from 'jest-extended'
// requires jest config resetMocks: false after react-scripts v4
import { noop } from 'lodash'
import 'vi-canvas-mock'

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

// Fix intermittent `ReferenceError: localStorage is not defined` (#3345). jsdom installs
// localStorage/sessionStorage as OWN globals and deletes them after each test file, but module-scoped
// throttled writers (e.g. saveJumpHistory) can fire timers post-teardown that hit the bare identifiers.
// Defining a fallback on the global PROTOTYPE keeps them resolvable (teardown only deletes OWN keys);
// jsdom's own properties shadow it during tests, so in-test behavior is unchanged.
const globalPrototype = Object.getPrototypeOf(globalThis)
// Guard against polluting Object.prototype in the unlikely event the global's prototype is Object.prototype.
if (globalPrototype && globalPrototype !== Object.prototype) {
  /** Creates a minimal in-memory Storage implementation for use as a post-teardown fallback. */
  const createStorageFallback = (): Storage => {
    const store = new Map<string, string>()
    return {
      clear: () => store.clear(),
      getItem: key => store.get(key) ?? null,
      key: index => Array.from(store.keys())[index] ?? null,
      removeItem: key => store.delete(key),
      setItem: (key, value) => store.set(key, `${value}`),
      get length() {
        return store.size
      },
    }
  }

  ;['localStorage', 'sessionStorage'].forEach(name => {
    // Only define the fallback once per worker; jsdom's own property shadows it during tests.
    if (!Object.prototype.hasOwnProperty.call(globalPrototype, name)) {
      Object.defineProperty(globalPrototype, name, {
        value: createStorageFallback(),
        writable: true,
        configurable: true,
        enumerable: false,
      })
    }
  })
}

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
