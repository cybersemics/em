import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import * as matchers from 'jest-extended'
// requires jest config resetMocks: false after react-scripts v4
import { noop } from 'lodash'
import { TextDecoder, TextEncoder } from 'util'
import 'vi-canvas-mock'

expect.extend(matchers)

// define missing global built-ins for jest
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// add noop functions to prevent implementation error during test
window.blur = noop
window.scrollTo = noop
window.matchMedia = window.matchMedia || (() => false)

document.execCommand = () => {
  console.warn('document.execCommand is not implemented in JSDOM')
}

const ResizeObserverMock = vi.fn(
  // eslint-disable-next-line jsdoc/require-jsdoc
  class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)

vi.stubGlobal('ResizeObserver', ResizeObserverMock)

HTMLImageElement.prototype.decode = vi.fn().mockResolvedValue(undefined)

// jsdom does not implement Range.prototype.getClientRects, which getCaretOffset uses for glyph hit-testing.
// Return an empty list to match jsdom's zero-size layout, preventing "range.getClientRects is not a function" errors.
if (typeof Range.prototype.getClientRects !== 'function') {
  Range.prototype.getClientRects = () => []
}

// stub jest globally. This is needed incase jest is being directly referenced in the code.
vi.stubGlobal('jest', vi)

// Fix the intermittent CI failure `ReferenceError: localStorage is not defined` (#3345).
//
// This is a teardown/lifecycle race, not a missing mock. util/storage.ts and util/storeSession.ts
// access the *bare identifiers* `localStorage`/`sessionStorage` (not `window.localStorage`). Vitest's
// jsdom environment installs those as OWN properties on the global object and deletes them at the end of
// each test file (`keys.forEach(key => delete global[key])`). Module-scoped throttled/debounced writers
// (e.g. saveJumpHistory, the storageCache setters, getEmThought's saveCache) schedule real timers that can
// fire AFTER teardown, at which point the bare identifiers are unbound and throw a ReferenceError. Because
// it depends on whether a stray timer happens to fire post-teardown, the failure is intermittent.
//
// Installing a persistent fallback on the global object's PROTOTYPE keeps the bare identifiers resolvable
// after teardown: teardown only deletes OWN keys, so the prototype entry survives. During a test the jsdom
// (own) `localStorage`/`sessionStorage` shadows this fallback, so in-test behavior is unchanged; the
// fallback only takes effect for stray post-teardown timer callbacks.
const globalPrototype = Object.getPrototypeOf(globalThis)
// Guard against polluting Object.prototype in the unlikely event the global's prototype is Object.prototype.
if (globalPrototype && globalPrototype !== Object.prototype) {
  /** Creates a minimal in-memory Storage implementation for use as a post-teardown fallback. */
  const createStorageFallback = () => {
    const store = new Map()
    return {
      clear: () => store.clear(),
      getItem: key => (store.has(key) ? store.get(key) : null),
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
