import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { pinCommandActionCreator as pinCommand } from '../../actions/pinCommand'
import { toggleMobileCommandUniverseActionCreator as toggleMobileCommandUniverse } from '../../actions/toggleMobileCommandUniverse'
import { HOME_TOKEN } from '../../constants'
import * as selection from '../../device/selection'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import importToContext from '../../test-helpers/importToContext'
import findThoughtByText from '../../test-helpers/queries/findThoughtByText'
import { setCursorFirstMatchActionCreator as setCursorFirstMatch } from '../../test-helpers/setCursorFirstMatch'
import head from '../../util/head'

vi.mock('../CommandUniverse/commandUniverseMotion', () => ({ default: { duration: 0, ease: 'linear' } }))

beforeEach(createTestApp)
beforeEach(() => {
  // JSDOM has no scrollTo. The existing search transition scroll reset is outside this test's behavior.
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: () => {} })
})
afterEach(async () => {
  cleanup()
  await cleanupTestApp()
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo')
})

it('expands the pinned gesture and reveals its command without changing the pin', async () => {
  await act(async () => {
    store.dispatch(pinCommand({ commandId: 'newThought' }))
    await vi.runAllTimersAsync()
  })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

  const ring = screen.getByRole('button', { name: 'Show gesture for New Thought' })
  await user.click(ring)
  await act(vi.runAllTimersAsync)

  const tooltip = screen.getByRole('dialog', { name: 'Gesture for New Thought' })
  expect(tooltip).toBeVisible()
  expect(ring).toHaveAttribute('aria-expanded', 'true')
  expect(within(tooltip).getByRole('button', { name: 'New Thought' })).toBeVisible()
  expect(within(tooltip).getByText('TIP')).toBeVisible()
  expect(within(tooltip).getByText('Clear')).toBeVisible()

  await user.click(within(tooltip).getByRole('button', { name: 'New Thought' }))
  await act(vi.runAllTimersAsync)

  expect(screen.getByRole('heading', { name: 'New Thought' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Show gesture for New Thought' })).toHaveAttribute('aria-expanded', 'false')
})

it('reveals the pinned command even after a different Command Universe search', async () => {
  await act(async () => {
    store.dispatch(pinCommand({ commandId: 'newThought' }))
    store.dispatch(toggleMobileCommandUniverse({ value: true }))
    await vi.runAllTimersAsync()
  })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

  await user.type(screen.getByPlaceholderText('Search for a command'), 'Indent')
  await act(vi.runAllTimersAsync)
  await user.click(screen.getByRole('button', { name: 'Close' }))
  await act(vi.runAllTimersAsync)

  await user.click(screen.getByRole('button', { name: 'Show gesture for New Thought' }))
  const tooltip = screen.getByRole('dialog', { name: 'Gesture for New Thought' })
  await user.click(within(tooltip).getByRole('button', { name: 'New Thought' }))
  await act(vi.runAllTimersAsync)

  expect(screen.getByRole('heading', { name: 'New Thought' })).toBeVisible()
})

it('closes on Escape and explains a command without a gesture', async () => {
  await act(async () => {
    store.dispatch(pinCommand({ commandId: 'settings' }))
    await vi.runAllTimersAsync()
  })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

  const ring = screen.getByRole('button', { name: 'Show gesture for Settings' })
  ring.focus()
  await user.keyboard('{Enter}')
  expect(screen.getByRole('dialog', { name: 'Gesture for Settings' })).toHaveTextContent(
    'No gesture is assigned to this command.',
  )

  await user.keyboard('{Escape}')
  expect(ring).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByRole('dialog', { name: 'Gesture for Settings' })).toBeNull()
})

it('dismisses when Clear is activated', async () => {
  await act(async () => {
    store.dispatch(pinCommand({ commandId: 'newThought' }))
    await vi.runAllTimersAsync()
  })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

  const ring = screen.getByRole('button', { name: 'Show gesture for New Thought' })
  await user.click(ring)
  await user.click(screen.getByText('Clear'))
  await act(vi.runAllTimersAsync)

  expect(ring).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByRole('dialog', { name: 'Gesture for New Thought' })).toBeNull()
})

it('dismisses when the user taps outside the tooltip', async () => {
  await act(async () => {
    store.dispatch(pinCommand({ commandId: 'newThought' }))
    await vi.runAllTimersAsync()
  })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

  const ring = screen.getByRole('button', { name: 'Show gesture for New Thought' })
  await user.click(ring)
  expect(ring).toHaveAttribute('aria-expanded', 'true')

  await user.click(document.body)
  await act(vi.runAllTimersAsync)

  expect(ring).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByRole('dialog', { name: 'Gesture for New Thought' })).toBeNull()
})

it('keeps the editor selection for Command Universe commands and earns no practice reps', async () => {
  await act(async () => {
    store.dispatch(importToContext('- Alpha'))
    store.dispatch(setCursorFirstMatch(['Alpha']))
    store.dispatch(pinCommand({ commandId: 'newThought' }))
    await vi.runAllTimersAsync()
  })
  const editable = await findThoughtByText('Alpha')
  expect(editable).not.toBeNull()
  act(() => selection.set(editable!, { offset: 2 }))
  const thoughtId = head(store.getState().cursor!)
  expect(selection.offsetRangeThought(thoughtId)).toEqual({ start: 2, end: 2 })

  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  await user.click(screen.getByRole('button', { name: 'Show gesture for New Thought' }))
  const tooltip = screen.getByRole('dialog', { name: 'Gesture for New Thought' })
  await user.click(within(tooltip).getByRole('button', { name: 'New Thought' }))
  await act(vi.runAllTimersAsync)

  expect(store.getState().selectionOffsets).toEqual({ thoughtId, start: 2, end: 2 })
  expect(store.getState().learning.progress.newThought?.reps).toBe(0)
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Alpha`)
})
