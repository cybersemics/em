import { createEvent, fireEvent, render } from '@testing-library/react'
import { Children, act, createElement } from 'react'
import { Provider } from 'react-redux'
import { clearActionCreator as clear } from '../../actions/clear'
import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleFormattingBarActionCreator as toggleFormattingBar } from '../../actions/toggleFormattingBar'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import virtualKeyboardStore from '../../stores/virtualKeyboardStore'
import contextToPathOrThrow from '../../test-helpers/contextToPathOrThrow'
import dispatch from '../../test-helpers/dispatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import durations from '../../util/durations'
import initialState from '../../util/initialState'
import Editable from '../Editable'
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

/** Renders the bar and optional picker with the application store. */
const renderWithStore = (...children: React.ReactElement[]) =>
  render(createElement(Provider, { store, children: Children.toArray(children) }))

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

it('apply a format once on touch release and consume the following click', async () => {
  await dispatch([importText({ text: '- hello' }), setCursor(['hello']), toggleFormattingBar({ value: true })])
  const path = contextToPathOrThrow(store.getState(), ['hello'], 'formatting button fixture')
  const view = renderWithStore(
    createElement(Editable, { path, simplePath: path, isEditing: true, isVisible: true }),
    createElement(FormattingBar),
  )
  const bold = view.getByRole('button', { name: 'Bold' })

  const release = await tap('[aria-label="Bold"]')
  await act(async () => {
    fireEvent.click(bold)
    await vi.runAllTimersAsync()
  })

  expect(release.defaultPrevented).toBe(true)
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - **hello**`)
})

it('cancel a formatting press when the finger moves or the browser cancels the touch', async () => {
  await dispatch([importText({ text: '- hello' }), setCursor(['hello']), toggleFormattingBar({ value: true })])
  const path = contextToPathOrThrow(store.getState(), ['hello'], 'formatting button fixture')
  const view = renderWithStore(
    createElement(Editable, { path, simplePath: path, isEditing: true, isVisible: true }),
    createElement(FormattingBar),
  )
  const bold = view.getByRole('button', { name: 'Bold' })

  await act(async () => {
    fireEvent.touchStart(bold, { touches: [{ clientX: 50, clientY: 50 }] })
    fireEvent.touchMove(bold, { touches: [{ clientX: 80, clientY: 50 }] })
    fireEvent.touchEnd(bold)
    fireEvent.touchStart(bold, { touches: [{ clientX: 50, clientY: 50 }] })
    fireEvent.touchCancel(bold)
    fireEvent.touchEnd(bold)
    await vi.runAllTimersAsync()
  })

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - hello`)
})

it('consume a disabled formatting button tap without executing it', async () => {
  const view = renderWithStore(createElement(FormattingBar))
  const bold = view.getByRole('button', { name: 'Bold' })
  expect(bold.getAttribute('aria-disabled')).toBe('true')

  const release = await tap('[aria-label="Bold"]')
  await act(vi.runAllTimersAsync)

  expect(release.defaultPrevented).toBe(true)
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}`)
})
