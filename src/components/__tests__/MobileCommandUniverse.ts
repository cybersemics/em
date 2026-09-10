import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { toggleMobileCommandUniverseActionCreator as toggleMobileCommandUniverse } from '../../actions/toggleMobileCommandUniverse'
import indentCommand from '../../commands/indent'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'

beforeEach(createTestApp)
afterEach(async () => {
  cleanup()
  await cleanupTestApp()
})

/** Opens the Commands dialog and settles its lazy imports. */
const openCommandUniverse = async () => {
  await act(async () => {
    store.dispatch(toggleMobileCommandUniverse({ value: true }))
    await vi.dynamicImportSettled()
    await vi.runAllTimersAsync()
  })
}

it('opens command details even when the command cannot execute in the current context', async () => {
  await openCommandUniverse()
  expect(indentCommand.canExecute(store.getState())).toBe(false)
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  await user.click(screen.getByRole('button', { name: 'Indent' }))
  await act(vi.runAllTimersAsync)
  expect(screen.getByRole('heading', { name: 'Indent' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled()
})

it.each(['{Enter}', ' '])('opens a detail page with %s and restores focus after Back', async key => {
  await openCommandUniverse()
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  const cell = screen.getByRole('button', { name: 'New Thought' })
  // Focus is the keyboard user's starting position. Activation still goes through the real key event.
  cell.focus()
  await user.keyboard(key)
  await act(vi.runAllTimersAsync)
  expect(screen.getByRole('heading', { name: 'New Thought' })).toHaveFocus()
  await user.click(screen.getByRole('button', { name: 'Back' }))
  await act(vi.runAllTimersAsync)
  expect(screen.getByRole('button', { name: 'New Thought' })).toHaveFocus()
})
