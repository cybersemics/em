import { fireEvent } from '@testing-library/react'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleDropdownActionCreator as toggleDropdown } from '../../actions/toggleDropdown'
import * as selection from '../../device/selection'
import store from '../../stores/app'
import click from '../../test-helpers/click'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('render EmptyThoughtspace when there are no thoughts in the root context', async () => {
  expect(document.querySelector('[aria-label="empty-thoughtspace"]')).toBeTruthy()
})

it('do not render EmptyThoughtspace when there are thoughts in the root context', async () => {
  await dispatch(
    importText({
      text: `
      - a
      - b
      - =test
    `,
    }),
  )

  await act(vi.runOnlyPendingTimersAsync)

  expect(document.querySelector('[aria-label="empty-thoughtspace"]')).toBeNull()
})

it('render EmptyThoughtspace when there are only invisible thoughts in the root context', async () => {
  await dispatch(
    importText({
      text: `
      - =test
    `,
    }),
  )

  await act(vi.runOnlyPendingTimersAsync)

  expect(document.querySelector('[aria-label="empty-thoughtspace"]')).toBeTruthy()
})

// The text selector and its context menu must be dismissed along with the keyboard. Covered here rather than in the
// puppeteer suite because that browser collapses a touch selection on blur, so the test passes there with or without
// the fix. See cursor-and-caret.md → Testing.
// https://github.com/cybersemics/em/issues/4833
it('clicking empty space collapses the text selection without blurring the thought', async () => {
  await dispatch([importText({ text: '- Cybersemics Institute' }), setCursor(['Cybersemics Institute'])])

  await act(vi.runOnlyPendingTimersAsync)

  // select a word in the thought, as double tapping it does on mobile
  const editable = document.querySelector('[data-editable]') as HTMLElement
  act(() => {
    editable.focus()
  })
  act(() => {
    selection.setRange(editable, { start: 0, end: 'Cybersemics'.length })
  })
  expect(selection.text()).toBe('Cybersemics')

  await click('#content-wrapper')

  // the range is gone, so the context menu has nothing left to display
  expect(selection.isCollapsed()).toBe(true)
  // the thought keeps the caret, so the keyboard is not torn down in the same beat as the context menu
  expect(document.activeElement).toBe(editable)
})

// When pressing a thought moves the content, e.g. by scrolling the new cursor out from under the Color Picker, the
// release lands on a different element and the browser dispatches the click to their common ancestor. That press began
// on a thought, so it must not be treated as a click on empty space.
// https://github.com/cybersemics/em/issues/6057
it('a press that begins on a thought and is released on empty space does not close the dropdowns', async () => {
  await dispatch([
    importText({ text: '- Labrador\n- Golden Retriever' }),
    setCursor(['Golden Retriever']),
    toggleDropdown({ dropDownType: 'colorPicker', value: true }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const editable = [...document.querySelectorAll('[data-editable]')].find(el => el.textContent === 'Labrador')!
  await act(async () => {
    fireEvent.mouseDown(editable)
  })
  await act(async () => {
    fireEvent.click(document.getElementById('content')!)
  })

  expect(store.getState().showColorPicker).toBe(true)
})

it('clicking empty space closes the dropdowns', async () => {
  await dispatch([importText({ text: '- Labrador' }), toggleDropdown({ dropDownType: 'colorPicker', value: true })])

  await act(vi.runOnlyPendingTimersAsync)

  await click('#content')

  expect(store.getState().showColorPicker).toBe(false)
})
