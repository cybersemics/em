import '@testing-library/jest-dom'
import Adapter from '@wojtekmaj/enzyme-adapter-react-17'
import crypto from 'crypto'
import { configure } from 'enzyme'
import 'fake-indexeddb/auto'
import * as matchers from 'jest-extended'
import 'jest-localstorage-mock'
import { noop } from 'lodash'

expect.extend(matchers)

configure({ adapter: new Adapter() })

// define global crypto so that yjs can be imported in jest tests
// https://stackoverflow.com/questions/52612122/how-to-use-jest-to-test-functions-using-crypto-or-window-mscrypto
// eslint-disable-next-line fp/no-mutating-methods
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: arr => crypto.randomBytes(arr.length),
  },
})

// add noop functions to prevent implementation error during test
window.blur = noop
window.scrollTo = noop
window.matchMedia = window.matchMedia || (() => false)
