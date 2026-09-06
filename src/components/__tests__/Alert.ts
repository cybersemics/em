import { screen } from '@testing-library/dom'
import { act } from 'react'
import { alertActionCreator as alert } from '../../actions/alert'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

/** Selects all of the text in the alert. */
const selectAlertText = () => {
  const range = document.createRange()
  range.selectNodeContents(screen.getByTestId('alert-content'))
  const selection = window.getSelection()!
  selection.removeAllRanges()
  selection.addRange(range)
}

it('auto-dismisses after clearDelay', async () => {
  await dispatch(alert('Hello', { clearDelay: 1000 }))
  // Do not flush all pending timers, or the auto-dismiss timer under test fires immediately.
  await act(async () => {})

  expect(screen.queryByTestId('alert-content')).toBeTruthy()

  await act(async () => {
    vi.advanceTimersByTime(1000)
  })

  expect(store.getState().alert).toBeNull()
})

it('does not auto-dismiss while text is selected on the alert', async () => {
  await dispatch(alert('Hello', { clearDelay: 1000 }))
  // Do not flush all pending timers, or the auto-dismiss timer under test fires immediately.
  await act(async () => {})

  await act(async () => {
    selectAlertText()
  })

  await act(async () => {
    vi.advanceTimersByTime(1000)
  })

  expect(store.getState().alert).not.toBeNull()

  // dismisses once the selection is released
  await act(async () => {
    window.getSelection()!.removeAllRanges()
  })
  await act(async () => {
    vi.advanceTimersByTime(1000)
  })

  expect(store.getState().alert).toBeNull()
})
