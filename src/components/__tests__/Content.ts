import { screen } from '@testing-library/react'
import { act } from 'react'
import { errorActionCreator as error } from '../../actions/error'
import { importTextActionCreator as importText } from '../../actions/importText'
import * as selection from '../../device/selection'
import click from '../../test-helpers/click'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('render EmptyThoughtspace when there are no thoughts in the root context', async () => {
  expect(document.querySelector('[aria-label="empty-thoughtspace"]')).toBeTruthy()
})

it('replaces the editor with the refresh screen on a fatal error', async () => {
  expect(screen.getByLabelText('empty-thoughtspace')).toBeTruthy()
  const report = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const message = 'Thoughtspace update failed. Editing has stopped. Reload to continue.'
  try {
    await dispatch(error({ value: message, fatal: true }))
    expect(screen.getByText(message)).toBeTruthy()
    expect(screen.getByText('Refresh')).toBeTruthy()
    expect(screen.queryByLabelText('empty-thoughtspace')).toBeNull()
  } finally {
    report.mockRestore()
  }
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
