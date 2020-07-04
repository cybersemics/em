import Adapter from 'enzyme-adapter-react-16'
import { configure } from 'enzyme'
import 'jest-localstorage-mock'
import './store'

configure({ adapter: new Adapter() })
