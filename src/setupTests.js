import '@testing-library/jest-dom'
import EnzymeAdapter from '@wojtekmaj/enzyme-adapter-react-17'
import crypto from 'crypto'
import { configure } from 'enzyme'
import 'fake-indexeddb/auto'
import * as matchers from 'jest-extended'
// requires jest config resetMocks: false after react-scripts v4
import 'jest-localstorage-mock'
import { noop } from 'lodash'
import { TextDecoder, TextEncoder } from 'util'

expect.extend(matchers)

configure({ adapter: new EnzymeAdapter() })

// define missing global built-ins for jest
global.crypto = crypto.webcrypto
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// add noop functions to prevent implementation error during test
window.blur = noop
window.scrollTo = noop
window.matchMedia = window.matchMedia || (() => false)
