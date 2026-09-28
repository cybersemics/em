import { alertActionCreator as alert } from '../../actions/alert'
import { clearMulticursorsActionCreator as clearMulticursors } from '../../actions/clearMulticursors'
import { importTextActionCreator as importText } from '../../actions/importText'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

// The multicursor alert is only shown on desktop (touch devices get the Command Center instead), so emulate a desktop.
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: false }
})

beforeEach(initStore)

it('shows and clears the multicursor alert as the selection changes', async () => {
  store.dispatch([
    importText({
      text: `
        - a
        - b`,
    }),
    setCursor(['a']),
    addMulticursor(['a']),
    addMulticursor(['b']),
  ])
  await vi.runAllTimersAsync()
  expect(store.getState().alert?.value).toBe('2 thoughts selected')

  store.dispatch(clearMulticursors())
  await vi.runAllTimersAsync()
  expect(store.getState().alert).toBeFalsy()
})

// https://github.com/cybersemics/em/issues/5257
it('does not dismiss an alert that replaced the multicursor alert before the throttled clear fires', async () => {
  store.dispatch([
    importText({
      text: `
        - a
        - b`,
    }),
    setCursor(['a']),
    addMulticursor(['a']),
    addMulticursor(['b']),
  ])
  await vi.runAllTimersAsync()
  expect(store.getState().alert?.value).toBe('2 thoughts selected')

  // The clear is throttled; another alert lands before it fires.
  store.dispatch([clearMulticursors(), alert('Rate limit reached. Please try again later.')])
  await vi.runAllTimersAsync()
  expect(store.getState().alert?.value).toBe('Rate limit reached. Please try again later.')
})
