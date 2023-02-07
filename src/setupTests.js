import '@testing-library/jest-dom'
import Adapter from '@wojtekmaj/enzyme-adapter-react-17'
import { configure } from 'enzyme'
import 'fake-indexeddb/auto'
import 'jest-localstorage-mock'
import { noop } from 'lodash'

configure({ adapter: new Adapter() })

// add noop functions to prevent implementation error during test
window.blur = noop
window.scrollTo = noop
window.matchMedia = window.matchMedia || (() => false)
