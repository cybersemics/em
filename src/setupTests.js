import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import * as matchers from 'jest-extended'
// requires jest config resetMocks: false after react-scripts v4
import { after, noop } from 'lodash'
import { TextDecoder, TextEncoder } from 'util'

expect.extend(matchers)

// define missing global built-ins for jest
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// add noop functions to prevent implementation error during test
window.blur = noop
window.scrollTo = noop
window.matchMedia = window.matchMedia || (() => false)

// Define a mock for document.execCommand if it does not exist
if (typeof document !== 'undefined' && !document.execCommand) {
  document.execCommand = () => {} // Default noop implementation
}

// Set up global beforeEach and afterEach hooks
beforeEach(() => {
  vi.spyOn(document, 'execCommand').mockImplementation(command => {
    return true
  })
})

// Restore all mocks after each test
afterEach(() => {
  vi.restoreAllMocks()
})
