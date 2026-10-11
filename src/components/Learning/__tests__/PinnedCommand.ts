import { cleanup, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { Provider } from 'react-redux'
import { pinCommandActionCreator as pinCommand } from '../../../actions/pinCommand'
import store from '../../../stores/app'
import storageModel from '../../../stores/storageModel'
import initStore from '../../../test-helpers/initStore'
import storage from '../../../util/storage'
import PinnedCommand from '../PinnedCommand'

afterEach(() => {
  cleanup()
  storageModel.remove('learning')
  vi.useRealTimers()
})

it('ignores a saved command that is no longer available', async () => {
  storage.setItem('learning', JSON.stringify({ pinnedCommandId: 'removedCommand', progress: {} }))
  await initStore()
  expect(store.getState().learning.pinnedCommandId).toBe('removedCommand')

  render(createElement(Provider, { store, children: createElement(PinnedCommand) }))

  expect(screen.queryByTestId('pinned-command')).toBeNull()
})

it('renders a restored command that is still available', async () => {
  storageModel.remove('learning')
  await initStore()
  store.dispatch(pinCommand({ commandId: 'indent' }))
  await initStore()

  render(createElement(Provider, { store, children: createElement(PinnedCommand) }))

  expect(screen.getByTestId('pinned-command')).toBeVisible()
  expect(screen.getByTestId('pinned-command')).toHaveAccessibleName(/Indent$/)
})
