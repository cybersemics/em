import Adapter from 'enzyme-adapter-react-16'
import { configure } from 'enzyme'
import 'jest-localstorage-mock'
import './store'

// TO-D0: Removing store from here causes circular dependency issue in utils. Fix it.

configure({ adapter: new Adapter() })
