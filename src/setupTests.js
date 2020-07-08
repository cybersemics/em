import Adapter from 'enzyme-adapter-react-16'
import { configure } from 'enzyme'
import 'jest-localstorage-mock'
import './store'
import { act } from 'react-dom/test-utils'
import { initialize } from './initialize'

/*******************************************************
 *    Global setup that runs before each test file     *
 * ****************************************************/

configure({ adapter: new Adapter() })

beforeAll(async () => {
  jest.useFakeTimers()
  // initialize db and window events before every test
  await initialize()
})

afterEach(() => {
  // Note: flushing all the pending timers that might execute after test is already complete
  act(() => jest.runOnlyPendingTimers())
})
