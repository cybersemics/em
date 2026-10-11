import { createEvent, fireEvent, render } from '@testing-library/react'
import { act, createElement } from 'react'
import { Provider } from 'react-redux'
import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleDropdownActionCreator as toggleDropdown } from '../../actions/toggleDropdown'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import dispatch from '../../test-helpers/dispatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import BulletPicker from '../BulletPicker'
import LetterCasePicker from '../LetterCasePicker'
import SortPicker from '../SortPicker'

// The toolbar dropdowns only register touch handlers on a touch device. The whole app cannot be mounted with
// isTouch true, since TraceGesture renders a signature pad onto a canvas that jsdom does not implement, so each
// dropdown is rendered on its own.
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: true }
})

beforeEach(initStore)

/** Taps an element within act blocks, simulating touchstart and touchend separately. Returns the touchend event, whose defaultPrevented says whether the tap was consumed, i.e. whether the browser would go on to synthesize mouse events from it at the tapped point. */
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

/*
  A tap that the element it lands on does not consume is completed by the browser, which synthesizes mouse events
  from it at the tapped point. A toolbar dropdown opens on top of the thoughts, so those events reach the editor
  underneath and move the cursor to the thought behind the tapped option (#5608). Consuming the touchend is what
  stops them, so each dropdown is checked for both halves: the tap applies the option, and the tap is consumed.
*/

it('a tap on a letter case option is consumed', async () => {
  await dispatch([
    importText({ text: '- hello world' }),
    setCursor(['hello world']),
    toggleDropdown({ dropDownType: 'letterCase', value: true }),
  ])
  render(createElement(Provider, { store, children: createElement(LetterCasePicker) }))

  const touchEnd = await tap('[aria-label="letter case swatches"] [aria-label="UpperCase"]')
  await act(vi.runAllTimersAsync)

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - HELLO WORLD`)
  expect(touchEnd.defaultPrevented).toBe(true)
})

it('a tap on a sort option is consumed', async () => {
  await dispatch([
    importText({ text: '- b\n- a' }),
    setCursor(['b']),
    toggleDropdown({ dropDownType: 'sortPicker', value: true }),
  ])
  render(createElement(Provider, { store, children: createElement(SortPicker) }))

  const touchEnd = await tap('[aria-label="sort options"] [aria-label="Alphabetical"]')
  await act(vi.runAllTimersAsync)

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - =sort
    - Alphabetical
      - Asc
  - a
  - b`)
  expect(touchEnd.defaultPrevented).toBe(true)
})

it('a tap on a bullet style option is consumed', async () => {
  await dispatch([
    importText({ text: '- a\n  - b' }),
    setCursor(['a', 'b']),
    toggleDropdown({ dropDownType: 'bulletPicker', value: true }),
  ])
  render(createElement(Provider, { store, children: createElement(BulletPicker) }))

  const touchEnd = await tap('[aria-label="bullet style options"] [aria-label="Numbers"]')
  await act(vi.runAllTimersAsync)

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
    - =children
      - =bullet
        - Ordered
    - b`)
  expect(touchEnd.defaultPrevented).toBe(true)
})
