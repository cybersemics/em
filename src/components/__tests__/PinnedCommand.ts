import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { toggleMobileCommandUniverseActionCreator as toggleMobileCommandUniverse } from '../../actions/toggleMobileCommandUniverse'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'

// These tests cover pinning, not elapsed motion time. Use real Motion with zero-duration settings.
vi.mock('../CommandUniverse/commandUniverseMotion', () => ({ default: { duration: 0, ease: 'linear' } }))

beforeEach(createTestApp)
afterEach(async () => {
  // Motion schedules cleanup on its shared frame loop. Unmount before flushing/resetting the fake clock.
  cleanup()
  await cleanupTestApp()
})

it('show the pinned command in the corner widget after pressing Pin Command on its detail page', async () => {
  await act(async () => {
    store.dispatch(toggleMobileCommandUniverse({ value: true }))
    await vi.runAllTimersAsync()
  })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  expect(screen.queryByTestId('pinned-command')).toBeNull()

  await user.click(screen.getByRole('button', { name: 'New Thought' }))
  await act(vi.runAllTimersAsync)
  await user.click(screen.getByRole('button', { name: 'Pin Command' }))
  await act(vi.runAllTimersAsync)

  expect(screen.getByTestId('pinned-command')).toBeVisible()
  expect(screen.getByTestId('pinned-command')).toHaveAccessibleName(/New Thought$/)
  expect(screen.getByRole('button', { name: 'Unpin Command' })).toBeVisible()
})

it('replace the pinned command when another command is pinned', async () => {
  await act(async () => {
    store.dispatch(toggleMobileCommandUniverse({ value: true }))
    await vi.runAllTimersAsync()
  })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

  await user.click(screen.getByRole('button', { name: 'New Thought' }))
  await act(vi.runAllTimersAsync)
  await user.click(screen.getByRole('button', { name: 'Pin Command' }))
  await act(vi.runAllTimersAsync)
  await user.click(screen.getByRole('button', { name: 'Back' }))
  await act(vi.runAllTimersAsync)
  await user.click(screen.getByRole('button', { name: 'Indent' }))
  await act(vi.runAllTimersAsync)

  const pinButton = screen.getByRole('button', { name: 'Pin Command' })
  await user.click(pinButton)
  await act(vi.runAllTimersAsync)

  expect(screen.getAllByTestId('pinned-command')).toHaveLength(1)
  expect(screen.getByTestId('pinned-command')).toBeVisible()
  expect(screen.getByTestId('pinned-command')).toHaveAccessibleName(/Indent$/)
})

it('remove the corner widget after pressing Unpin Command', async () => {
  await act(async () => {
    store.dispatch(toggleMobileCommandUniverse({ value: true }))
    await vi.runAllTimersAsync()
  })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

  await user.click(screen.getByRole('button', { name: 'New Thought' }))
  await act(vi.runAllTimersAsync)
  await user.click(screen.getByRole('button', { name: 'Pin Command' }))
  await act(vi.runAllTimersAsync)
  await user.click(screen.getByRole('button', { name: 'Unpin Command' }))
  await act(vi.runAllTimersAsync)

  expect(screen.queryByTestId('pinned-command')).toBeNull()
  expect(screen.getByRole('button', { name: 'Pin Command' })).toBeVisible()
})
