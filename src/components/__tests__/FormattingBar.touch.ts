import { createEvent, fireEvent, render } from '@testing-library/react'
import { act, createElement } from 'react'
import { Provider } from 'react-redux'
import { clearActionCreator as clear } from '../../actions/clear'
import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleFormattingBarActionCreator as toggleFormattingBar } from '../../actions/toggleFormattingBar'
import store from '../../stores/app'
import virtualKeyboardStore from '../../stores/virtualKeyboardStore'
import dispatch from '../../test-helpers/dispatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import durations from '../../util/durations'
import initialState from '../../util/initialState'
import DragAndDropContext from '../DragAndDropContext'
import FormattingBar from '../FormattingBar'

// The Formatting Bar is only rendered on a touch device. The whole app cannot be mounted with isTouch true, since
// TraceGesture renders a signature pad onto a canvas that jsdom does not implement, so the bar is rendered on its own.
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: true }
})

beforeEach(async () => {
  await initStore()
  // The bar is shown above the virtual keyboard, which jsdom does not have.
  virtualKeyboardStore.update({ open: true, height: 300 })
})

afterEach(() => {
  act(() => virtualKeyboardStore.update({ open: false, height: 0 }))
  durations.setInTest(false)
})

/** Renders the given elements with the store and the drag-and-drop context that the Formatting Bar's buttons, being toolbar buttons, require. */
const renderWithStore = (...children: React.ReactElement[]) =>
  render(createElement(Provider, { store, children: createElement(DragAndDropContext, { children }) }))

/** Taps an element within act blocks, simulating touchstart and touchend separately. Returns the touchend event, whose defaultPrevented says whether the tap was consumed, i.e. whether the browser would go on to move the focus out of the editable and close the virtual keyboard. */
const tap = async (selector: string): Promise<Event> => {
  const el = document.querySelector(selector)
  if (!el) {
    throw new Error(`Element not found for selector: ${selector}`)
  }
  await act(async () => {
    fireEvent.touchStart(el)
  })
  const touchEnd = createEvent.touchEnd(el)
  await act(async () => {
    fireEvent(el, touchEnd)
  })
  return touchEnd
}

it('keep the keyboard open when a tap in the Formatting Bar misses its buttons', async () => {
  await dispatch([importText({ text: '- hello' }), setCursor(['hello']), toggleFormattingBar({ value: true })])
  renderWithStore(createElement(FormattingBar))

  // The bar itself, i.e. a tap between the buttons or near the edge of the bar.
  const touchEnd = await tap('[role="toolbar"][aria-label="Formatting Bar"]')

  expect(touchEnd.defaultPrevented).toBe(true)
})

it('starts closed and persists opening and closing without releasing editor focus', async () => {
  // initStore cleared storage; reconstruct state from that fresh preference.
  await dispatch(clear())
  renderWithStore(createElement(FormattingBar))
  const bar = document.querySelector('[aria-label="Formatting Bar"]')
  expect(bar?.hasAttribute('inert')).toBe(true)
  expect(initialState().showFormattingBar).toBe(false)

  const open = await tap('[aria-label="Open formatting bar"]')
  expect(open.defaultPrevented).toBe(true)
  expect(bar?.hasAttribute('inert')).toBe(false)
  expect(initialState().showFormattingBar).toBe(true)

  const close = await tap('[aria-label="Close formatting bar"]')
  expect(close.defaultPrevented).toBe(true)
  expect(bar?.hasAttribute('inert')).toBe(true)
  expect(initialState().showFormattingBar).toBe(false)
})
