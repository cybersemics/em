import { TUTORIAL_STEP_START } from '../../constants'
import getSetting from '../../selectors/getSetting'
import store from '../../stores/app'
import initStore from '../initStore'

beforeEach(initStore)

it('skips the tutorial by default', () => {
  expect(getSetting(store.getState(), 'Tutorial')).toBe('Off')
})

describe('allowTutorial', () => {
  // Nested under the file-level skip, as a describe block of tutorial tests in a command test file is.
  beforeEach(() => initStore({ allowTutorial: true }))

  it('starts the tutorial at the welcome step after a previous call skipped it', () => {
    const state = store.getState()
    expect(getSetting(state, 'Tutorial')).toBe('On')
    expect(getSetting(state, 'Tutorial Step')).toBe(TUTORIAL_STEP_START.toString())
  })
})
