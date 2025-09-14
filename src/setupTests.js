import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import * as matchers from 'jest-extended'
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
