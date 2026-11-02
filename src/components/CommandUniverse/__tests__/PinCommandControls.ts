import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { toggleMobileCommandUniverseActionCreator as toggleMobileCommandUniverse } from '../../../actions/toggleMobileCommandUniverse'
import store from '../../../stores/app'
import createTestApp, { cleanupTestApp } from '../../../test-helpers/createTestApp'
import useViewportForSuite from '../../../test-helpers/useViewportForSuite'
import durations from '../../../util/durations'

vi.mock('../commandUniverseMotion', () => ({ default: { duration: 0, ease: 'linear' } }))
const originalDurationMode = durations.get('fast') === 0
beforeEach(() => durations.setInTest(true))
beforeEach(createTestApp)
useViewportForSuite({ width: 320 })
afterEach(async () => {
  cleanup()
  await cleanupTestApp()
  durations.setInTest(originalDurationMode)
})

it('pins and unpins a command through its detail controls', async () => {
  await act(async () => {
    store.dispatch(toggleMobileCommandUniverse({ value: true }))
    await vi.runAllTimersAsync()
  })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  await user.click(screen.getByRole('button', { name: 'New Thought' }))
  await act(vi.runAllTimersAsync)
  await user.click(screen.getByRole('button', { name: 'Pin Command' }))
  expect(screen.getByRole('button', { name: 'Unpin Command' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Unpin Command' }))
  expect(screen.getByRole('button', { name: 'Pin Command' })).toBeVisible()
})
