import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { toggleMobileCommandUniverseActionCreator as toggleMobileCommandUniverse } from '../../actions/toggleMobileCommandUniverse'
import indentCommand from '../../commands/indent'
import store from '../../stores/app'
import viewportStore from '../../stores/viewportStore'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'

// These tests cover navigation and focus, not elapsed motion time. Use real Motion with zero-duration settings.
vi.mock('../CommandUniverse/commandUniverseMotion', () => ({ default: { duration: 0, ease: 'linear' } }))

// JSDOM has no element scrolling. These tests cover control state, not scroll position.
const scrollTo = Element.prototype.scrollTo
beforeAll(() => {
  Element.prototype.scrollTo = vi.fn()
})
afterAll(() => {
  Element.prototype.scrollTo = scrollTo
})

beforeEach(createTestApp)
beforeEach(() => act(() => viewportStore.update({ innerWidth: 320 })))
afterEach(async () => {
  // Motion schedules cleanup on its shared frame loop. Unmount before flushing/resetting the fake clock.
  cleanup()
  await cleanupTestApp()
})

it('opens command details even when the command cannot execute in the current context', async () => {
  await act(async () => {
    store.dispatch(toggleMobileCommandUniverse({ value: true }))
    await vi.runAllTimersAsync()
  })
  expect(indentCommand.canExecute(store.getState())).toBe(false)
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  await user.click(screen.getByRole('button', { name: 'Indent' }))
  await act(vi.runAllTimersAsync)
  expect(screen.getByRole('heading', { name: 'Indent' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled()
})

it.each(['{Enter}', ' '])('opens a detail page with %s and restores focus after Back', async key => {
  await act(async () => {
    store.dispatch(toggleMobileCommandUniverse({ value: true }))
    await vi.runAllTimersAsync()
  })
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

it('updates search and sorting without notifying Redux subscribers', async () => {
  await act(async () => {
    store.dispatch(toggleMobileCommandUniverse({ value: true }))
    await vi.runAllTimersAsync()
  })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  const onReduxChange = vi.fn()
  // eslint-disable-next-line em/no-store-subscribe-in-components -- Observe Redux notifications in a test, not a ministore in a component.
  const unsubscribe = store.subscribe(onReduxChange)
  try {
    await user.click(screen.getByRole('button', { name: 'Group commands' }))
    await user.click(screen.getByRole('radio', { name: 'Alphabetical' }))
    await user.type(screen.getByPlaceholderText('Search for a command'), 'zzzz')
    await act(vi.runAllTimersAsync)

    expect(screen.getByPlaceholderText('Search for a command')).toHaveValue('zzzz')
    expect(screen.queryByRole('button', { name: 'Indent' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New Thought' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Group commands' }))
    expect(screen.getByRole('radio', { name: 'Alphabetical' })).toBeChecked()
    expect(onReduxChange).not.toHaveBeenCalled()
  } finally {
    unsubscribe()
  }
})

it('retains browsing controls through Back and Forward and clears search on a fresh opening', async () => {
  await act(async () => {
    store.dispatch(toggleMobileCommandUniverse({ value: true }))
    await vi.runAllTimersAsync()
  })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  await user.click(screen.getByRole('button', { name: 'Group commands' }))
  await user.click(screen.getByRole('radio', { name: 'Alphabetical' }))
  await user.type(screen.getByPlaceholderText('Search for a command'), 'indent')
  await act(vi.runAllTimersAsync)
  await user.click(screen.getByRole('button', { name: 'Indent' }))
  await act(vi.runAllTimersAsync)
  expect(screen.getByRole('heading', { name: 'Indent' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Back' }))
  await act(vi.runAllTimersAsync)
  expect(screen.getByPlaceholderText('Search for a command')).toHaveValue('indent')
  await user.click(screen.getByRole('button', { name: 'Forward' }))
  await act(vi.runAllTimersAsync)
  expect(screen.getByRole('heading', { name: 'Indent' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Back' }))
  await act(vi.runAllTimersAsync)
  await user.click(screen.getByRole('button', { name: 'Group commands' }))
  expect(screen.getByRole('radio', { name: 'Alphabetical' })).toBeChecked()
  await user.click(screen.getByRole('button', { name: 'Close' }))
  await act(vi.runAllTimersAsync)
  await act(async () => {
    store.dispatch(toggleMobileCommandUniverse({ value: true }))
    await vi.runAllTimersAsync()
  })
  expect(screen.getByPlaceholderText('Search for a command')).toHaveValue('')
  expect(screen.getByRole('button', { name: 'New Thought' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Group commands' }))
  expect(screen.getByRole('radio', { name: 'Alphabetical' })).toBeChecked()
})
