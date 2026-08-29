import { act } from 'react'
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

// https://github.com/cybersemics/em/issues/4833
it.skip('clicking empty space dismisses the text selection', async () => {
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

  expect(selection.isActive()).toBe(false)
})
