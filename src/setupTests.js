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

/** Minimal localStorage mock for Node.js/CI environments. Implements Storage interface for compatibility. */
class LocalStorageMock {
  constructor() {
    this.store = {}
  }

  clear() {
    this.store = {}
  }

  getItem(key) {
    return this.store[key] ?? null
  }

  setItem(key, value) {
    this.store[key] = String(value)
  }

  removeItem(key) {
    delete this.store[key]
  }

  get length() {
    return Object.keys(this.store).length
  }

  key(index) {
    const keys = Object.keys(this.store)
    return keys[index] ?? null
  }
}

// Ensure localStorage is always available (polyfill for Node.js, fallback for jsdom)
// This allows spying on Storage.prototype if needed, as per Stack Overflow solution:
// https://stackoverflow.com/questions/32911630/how-do-i-deal-with-localstorage-in-jest-tests
if (typeof window === 'undefined' || typeof window.localStorage === 'undefined' || window.localStorage === null) {
  // Polyfill for Node.js/CI environments
  globalThis.localStorage = new LocalStorageMock()
  if (typeof global !== 'undefined') {
    global.localStorage = globalThis.localStorage
  }
} else if (typeof global !== 'undefined' && typeof global.localStorage === 'undefined') {
  // Also set on global for Node.js environments that have window but need global
  global.localStorage = window.localStorage
}

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

// stub jest globally. This is needed incase jest is being directly referenced in the code.
vi.stubGlobal('jest', vi)
