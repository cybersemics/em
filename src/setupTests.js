import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
// requires jest config resetMocks: false after react-scripts v4
import { noop } from 'lodash'
import { TextDecoder, TextEncoder } from 'util'
import 'vitest-canvas-mock'

// Ensure libraries that expect a Jest global (e.g., jest-canvas-mock via vitest-canvas-mock)
// can operate under Vitest by aliasing jest to vi in unit tests.
// Must be set before importing vitest-canvas-mock to avoid CI races.
globalThis.jest = vi

// Ensure libraries that expect a Jest global (e.g., jest-canvas-mock via vitest-canvas-mock)
// can operate under Vitest by aliasing jest to vi in unit tests.
// This must run BEFORE importing 'vitest-canvas-mock' to avoid race conditions in CI.
// Some libraries lazily import parts of jest-canvas-mock later (e.g., createImageBitmap),
// and vitest-canvas-mock removes global.jest in its own afterAll. To keep things stable
// across files/workers, always re-assert the alias.
// Ensure alias remains if other setup manipulates it
afterAll(() => {
  if (!globalThis.jest) globalThis.jest = vi
})

// Minimal replacements for assertions previously provided by jest-extended
expect.extend({
  toBeFalse(received) {
    const pass = received === false
    return {
      pass,
      message: () => `expected ${received} to strictly equal false`,
    }
  },
  toBeEmpty(received) {
    const isObj = v => v != null && typeof v === 'object'
    const size = v =>
      Array.isArray(v) || typeof v === 'string'
        ? v.length
        : v instanceof Map || v instanceof Set
          ? v.size
          : isObj(v)
            ? Object.keys(v).length
            : undefined
    const n = size(received)
    const pass = n === 0
    return {
      pass,
      message: () => `expected ${JSON.stringify(received)} to be empty`,
    }
  },
})

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
