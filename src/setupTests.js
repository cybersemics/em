import Adapter from 'enzyme-adapter-react-16'
import { configure } from 'enzyme'
import { noop } from 'lodash'
import 'jest-localstorage-mock'
import 'fake-indexeddb/auto'

configure({ adapter: new Adapter() })

// add noop function to window.scrollTo to prevent implementation error during test
window.scrollTo = noop
