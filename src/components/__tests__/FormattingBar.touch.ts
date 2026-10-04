import { createEvent, fireEvent, render } from '@testing-library/react'
import { act, createElement } from 'react'
import { Provider } from 'react-redux'
import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleFormattingBarActionCreator as toggleFormattingBar } from '../../actions/toggleFormattingBar'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import formattingBarPopoverInfoStore from '../../stores/formattingBarPopoverInfoStore'
import virtualKeyboardStore from '../../stores/virtualKeyboardStore'
import dispatch from '../../test-helpers/dispatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import durations from '../../util/durations'
import ColorPicker from '../ColorPicker'
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
  // The info button's state is shared by every picker and outlives a test.
  formattingBarPopoverInfoStore.update(false)
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

it('set a heading level from the Formatting Bar heading picker', async () => {
  await dispatch([importText({ text: '- hello' }), setCursor(['hello']), toggleFormattingBar({ value: true })])
  renderWithStore(createElement(FormattingBar))

  const buttonTouchEnd = await tap('[data-testid="toolbar-icon"][aria-label="Heading"]')
  const optionTouchEnd = await tap('[aria-label="Heading Picker"] [aria-label="Heading 2"]')
  await act(vi.runAllTimersAsync)

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - hello
    - =heading2`)
  // Both taps are consumed, so neither moves the focus out of the editable and closes the virtual keyboard.
  expect(buttonTouchEnd.defaultPrevented).toBe(true)
  expect(optionTouchEnd.defaultPrevented).toBe(true)
})

it('open the Color Picker only in the Formatting Bar when its Text Color button is tapped', async () => {
  await dispatch([importText({ text: '- hello' }), setCursor(['hello']), toggleFormattingBar({ value: true })])
  // The Toolbar renders its own Color Picker inside its Text Color button, which must stay closed.
  renderWithStore(createElement(FormattingBar), createElement(ColorPicker))

  await tap('[data-testid="toolbar-icon"][aria-label="Text Color"]')

  expect(document.querySelectorAll('[aria-label="Color Picker"]')).toHaveLength(1)
})

it('close a picker opened from the Formatting Bar when the bar is closed', async () => {
  // The picker stays mounted until its closing animation ends, so make the animation instant.
  durations.setInTest(true)
  await dispatch([importText({ text: '- hello' }), setCursor(['hello']), toggleFormattingBar({ value: true })])
  renderWithStore(createElement(FormattingBar))

  await tap('[data-testid="toolbar-icon"][aria-label="Heading"]')
  expect(document.querySelector('[aria-label="Heading Picker"]')).not.toBeNull()

  await tap('[aria-label="Close formatting bar"]')
  await act(vi.runAllTimersAsync)

  expect(document.querySelector('[aria-label="Heading Picker"]')).toBeNull()
})

it('mark the default text color swatch for a thought with no color', async () => {
  await dispatch([importText({ text: '- hello' }), setCursor(['hello']), toggleFormattingBar({ value: true })])
  renderWithStore(createElement(FormattingBar))

  await tap('[data-testid="toolbar-icon"][aria-label="Text Color"]')

  const selected = Array.from(document.querySelectorAll('[aria-label="Color Picker"] [data-selected="true"]'))
  expect(selected.map(option => option.getAttribute('aria-label'))).toEqual(['default'])
})

it('highlight a picker button in the Formatting Bar only while its picker is open', async () => {
  await dispatch([importText({ text: '- hello' }), setCursor(['hello']), toggleFormattingBar({ value: true })])
  renderWithStore(createElement(FormattingBar))

  const textColorButton = '[data-testid="toolbar-icon"][aria-label="Text Color"]'
  expect(document.querySelector(textColorButton)?.getAttribute('data-active')).toBe('false')

  await tap(textColorButton)

  expect(document.querySelector(textColorButton)?.getAttribute('data-active')).toBe('true')
})

it('keep the keyboard open when a tap in the Formatting Bar misses its buttons', async () => {
  await dispatch([importText({ text: '- hello' }), setCursor(['hello']), toggleFormattingBar({ value: true })])
  renderWithStore(createElement(FormattingBar))

  // The bar itself, i.e. a tap between the buttons or near the edge of the bar.
  const touchEnd = await tap('[role="toolbar"][aria-label="Formatting Bar"]')

  expect(touchEnd.defaultPrevented).toBe(true)
})

it('show the description of a Formatting Bar picker when its info button is tapped', async () => {
  await dispatch([importText({ text: '- hello' }), setCursor(['hello']), toggleFormattingBar({ value: true })])
  renderWithStore(createElement(FormattingBar))

  await tap('[data-testid="toolbar-icon"][aria-label="Heading"]')
  const picker = '[aria-label="Heading Picker"]'
  /** Returns the picker's description element, which stays mounted while hidden so that it can animate in. */
  const description = () => document.querySelector(`${picker} [aria-hidden]`)
  expect(description()?.textContent).toContain('headings of different sizes')
  expect(description()?.getAttribute('aria-hidden')).toBe('true')

  const infoTouchEnd = await tap(`${picker} [aria-label="Info"]`)

  expect(description()?.getAttribute('aria-hidden')).toBe('false')
  // The picker stays open, and the tap is consumed so the keyboard stays open too.
  expect(infoTouchEnd.defaultPrevented).toBe(true)
})

it('show the description in every Formatting Bar picker once the info button is tapped in one', async () => {
  await dispatch([importText({ text: '- hello' }), setCursor(['hello']), toggleFormattingBar({ value: true })])
  renderWithStore(createElement(FormattingBar))

  await tap('[data-testid="toolbar-icon"][aria-label="Heading"]')
  await tap('[aria-label="Heading Picker"] [aria-label="Info"]')
  await tap('[data-testid="toolbar-icon"][aria-label="Text Color"]')

  expect(document.querySelector('[aria-label="Color Picker"] [aria-label="Info"]')?.getAttribute('aria-pressed')).toBe(
    'true',
  )
})
