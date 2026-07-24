import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import * as matchers from 'jest-extended'
// requires jest config resetMocks: false after react-scripts v4
import { noop } from 'lodash'
import { TextDecoder, TextEncoder } from 'util'
import 'vi-canvas-mock'
import createId from './util/createId'

expect.extend(matchers)

// define missing global built-ins for jest
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// add noop functions to prevent implementation error during test
window.blur = noop
window.scrollTo = noop
window.matchMedia = window.matchMedia || (() => false)

// Unit tests explicitly configure an in-memory TreeCRDT client before application modules are evaluated.
window.emConfig = {
  ...window.emConfig,
  treecrdt: {
    client: {
      storage: 'memory',
      runtime: 'direct',
      docId: createId(),
    },
    tabPolicy: 'multiple',
  },
}

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

// Fix intermittent `ReferenceError: localStorage is not defined` (#3345). jsdom installs
// localStorage/sessionStorage as OWN globals and deletes them after each test file, but module-scoped
// throttled writers (e.g. saveJumpHistory) can fire timers post-teardown that hit the bare identifiers.
// Defining a fallback on the global PROTOTYPE keeps them resolvable (teardown only deletes OWN keys);
// jsdom's own properties shadow it during tests, so in-test behavior is unchanged.
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
