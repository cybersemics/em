import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import * as matchers from 'jest-extended'
// requires jest config resetMocks: false after react-scripts v4
import { noop } from 'lodash'
import { TextDecoder, TextEncoder } from 'util'
import { vi } from 'vitest'

// Set up jest global on all possible global objects
global.jest = vi
globalThis.jest = vi
if (typeof window !== 'undefined') window.jest = vi

// Ensure jest.fn is available
global.jest.fn = vi.fn
globalThis.jest.fn = vi.fn
if (typeof window !== 'undefined') window.jest.fn = vi.fn

// Now it's safe to import vitest-canvas-mock
await import('vitest-canvas-mock')

// Keep jest global maintained throughout the test run
beforeEach(() => {
  // Ensure jest is always available before each test
  if (!global.jest) {
    global.jest = vi
    globalThis.jest = vi
    if (typeof window !== 'undefined') window.jest = vi
  }
  if (!global.jest.fn) {
    global.jest.fn = vi.fn
    globalThis.jest.fn = vi.fn
    if (typeof window !== 'undefined') window.jest.fn = vi.fn
  }
})

afterAll(() => {
  // Final cleanup to ensure jest is available
  global.jest = vi
  globalThis.jest = vi
  if (typeof window !== 'undefined') window.jest = vi
})

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

const ResizeObserverMock = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

vi.stubGlobal('ResizeObserver', ResizeObserverMock)
