import Adapter from 'enzyme-adapter-react-16'
import { configure } from 'enzyme'
import { noop } from 'lodash'
import 'jest-localstorage-mock'

// TO-D0: Removing store from here causes circular dependency issue in utils. Fix it.

configure({ adapter: new Adapter() })

// add noop function to window.scrollTo to prevent implementation error during test
window.scrollTo = noop
