import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import * as matchers from 'jest-extended'
import * as lib0Encoding from 'lib0/encoding'
// requires jest config resetMocks: false after react-scripts v4
import { noop } from 'lodash'
import { TextDecoder, TextEncoder } from 'util'
import 'vi-canvas-mock'

expect.extend(matchers)

// Yjs can pass undefined to writeVarString (e.g. parentSub), which lib0 does not handle.
const originalWriteVarString = lib0Encoding.writeVarString
lib0Encoding.writeVarString = (encoder, str) => originalWriteVarString(encoder, str ?? '')

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

// stub jest globally. This is needed incase jest is being directly referenced in the code.
vi.stubGlobal('jest', vi)
