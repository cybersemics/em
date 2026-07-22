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

// Unit tests use an explicitly configured in-memory TreeCRDT client. The application reads preloaded test flags
// when its modules are evaluated, matching the established pre-bootstrap configuration used by browser tests.
window.em = {
  ...(window.em || {}),
  testFlags: {
    ...(window.em?.testFlags || {}),
    treecrdtClientConfig: {
      storage: 'memory',
      runtime: 'direct',
      docId: createId(),
    },
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
