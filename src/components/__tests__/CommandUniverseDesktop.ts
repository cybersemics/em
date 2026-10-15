import { cleanup, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { toggleMobileCommandUniverseActionCreator as toggleMobileCommandUniverse } from '../../actions/toggleMobileCommandUniverse'
import store from '../../stores/app'
import storageModel from '../../stores/storageModel'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'

// Real Motion retains its lifecycle while page transitions complete immediately in these interaction tests.
vi.mock('../CommandUniverse/commandUniverseMotion', () => ({ default: { duration: 0, ease: 'linear' } }))

beforeEach(async () => {
  const matchMedia = window.matchMedia
  vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
    ...matchMedia(query),
    matches: query === '(min-width: 400px)',
  }))
  await createTestApp()
})
afterEach(async () => {
  await act(async () => {
    store.dispatch(toggleMobileCommandUniverse({ value: false }))
  })
  cleanup()
  await cleanupTestApp()
  vi.restoreAllMocks()
})

it('navigates a disabled command to details, and retains search on Back', async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  await act(async () => {
    store.dispatch(toggleMobileCommandUniverse({ value: true }))
    await vi.runAllTimersAsync()
  })
  const search = screen.getByRole('textbox', { name: 'Search for a command' })
  expect(search).toHaveFocus()
  await user.type(search, 'indent')
  await user.click(screen.getByRole('option', { name: 'Indent' }))
  expect(screen.getByText("Indent isn't available right now")).toBeVisible()
  await user.click(search)
  await user.keyboard('{Tab}')
  await act(vi.runAllTimersAsync)
  expect(screen.getByRole('heading', { name: 'Indent' })).toBeVisible()
  await user.keyboard('{Shift>}{Tab}{/Shift}')
  await act(vi.runAllTimersAsync)
  expect(screen.getByRole('textbox', { name: 'Search for a command' })).toHaveValue('indent')
  expect(screen.getByRole('textbox', { name: 'Search for a command' })).toHaveFocus()
})

it('executes a command from the list and refreshes recent commands on a fresh open', async () => {
  await act(async () => {
    store.dispatch(toggleMobileCommandUniverse({ value: true }))
    await vi.runAllTimersAsync()
  })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  const search = screen.getByRole('textbox', { name: 'Search for a command' })
  await user.type(search, 'new thought')
  await user.click(screen.getByRole('option', { name: 'New Thought' }))
  await act(vi.runAllTimersAsync)
  expect(screen.queryByRole('listbox', { name: 'Commands' })).not.toBeInTheDocument()
  await act(async () => {
    store.dispatch(toggleMobileCommandUniverse({ value: true }))
    await vi.runAllTimersAsync()
  })
  expect(screen.getByRole('textbox', { name: 'Search for a command' })).toHaveValue('')
  expect(screen.getByRole('option', { selected: true })).toHaveAccessibleName('New Thought')
})

it('moves between recent commands with arrows, preserves caret keys, and closes with Escape', async () => {
  storageModel.set('recentCommands', ['newThought', 'undo'])
  await act(async () => {
    store.dispatch(toggleMobileCommandUniverse({ value: true }))
    await vi.runAllTimersAsync()
  })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  expect(screen.getByRole('option', { selected: true })).toHaveAccessibleName('New Thought')
  await user.keyboard('{ArrowDown}')
  expect(screen.getByRole('option', { name: 'Undo', selected: true })).toBeVisible()
  await user.keyboard('{ArrowUp}')
  expect(screen.getByRole('option', { selected: true })).toHaveAccessibleName('New Thought')
  await user.keyboard('new{ArrowLeft}')
  expect(screen.getByRole('textbox', { name: 'Search for a command' })).toHaveFocus()
  await user.keyboard('{Escape}')
  await act(vi.runAllTimersAsync)
  expect(screen.queryByRole('listbox', { name: 'Commands' })).not.toBeInTheDocument()
})

it('keeps sorting controlled, restores search focus, and handles empty results and composition', async () => {
  await act(async () => {
    store.dispatch(toggleMobileCommandUniverse({ value: true }))
    await vi.runAllTimersAsync()
  })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  await user.click(screen.getByRole('button', { name: 'Group commands' }))
  expect(screen.getByRole('radio', { name: 'Recently used' })).toBeChecked()
  await user.click(screen.getByRole('radio', { name: 'Type' }))
  expect(screen.getByRole('heading', { name: 'Creating Thoughts' })).toBeVisible()
  const search = screen.getByRole('textbox', { name: 'Search for a command' })
  expect(search).toHaveFocus()
  await user.type(search, 'qzxqzxqzxqzxqzx')
  expect(screen.getByRole('status')).toHaveTextContent('No matching commands')
  await user.clear(search)
  expect(screen.getByRole('heading', { name: 'Creating Thoughts' })).toBeVisible()
  fireEvent.keyDown(search, { key: 'Enter', isComposing: true })
  expect(screen.getByRole('listbox', { name: 'Commands' })).toBeVisible()
})

it('moves focus by page with PageDown and PageUp', async () => {
  storageModel.set('recentCommands', ['newThought', 'undo'])
  await act(async () => {
    store.dispatch(toggleMobileCommandUniverse({ value: true }))
    await vi.runAllTimersAsync()
  })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  expect(screen.getByRole('option', { selected: true })).toHaveAccessibleName('New Thought')
  await user.keyboard('{PageDown}')
  expect(screen.getByRole('option', { selected: true })).not.toHaveAccessibleName('New Thought')
  await user.keyboard('{PageUp}')
  expect(screen.getByRole('option', { selected: true })).toHaveAccessibleName('New Thought')
})

it('keeps arrow keys on the list when focus is on the sort button, closing its dropdown', async () => {
  storageModel.set('recentCommands', ['newThought', 'undo'])
  await act(async () => {
    store.dispatch(toggleMobileCommandUniverse({ value: true }))
    await vi.runAllTimersAsync()
  })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  await user.click(screen.getByRole('button', { name: 'Group commands' }))
  expect(screen.getByRole('radio', { name: 'Recently used' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Group commands' })).toHaveFocus()
  await user.keyboard('{ArrowDown}')
  await act(vi.runAllTimersAsync)
  expect(screen.getByRole('option', { selected: true })).toHaveAccessibleName('Undo')
  expect(screen.getByRole('textbox', { name: 'Search for a command' })).toHaveFocus()
  expect(screen.queryByRole('radio', { name: 'Recently used' })).not.toBeInTheDocument()
})
