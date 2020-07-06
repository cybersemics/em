import Adapter from 'enzyme-adapter-react-16'
import { configure } from 'enzyme'
import 'jest-localstorage-mock'
import './store'
import { act } from 'react-dom/test-utils'

configure({ adapter: new Adapter() })

beforeAll(() => {
  jest.useFakeTimers()
})

// Note: flushing all the pending timers that might execute after test is already complete
afterEach(() => {
  act(() => jest.runOnlyPendingTimers())
})
