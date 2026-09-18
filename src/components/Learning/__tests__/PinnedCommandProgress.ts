import { cleanup, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { Provider } from 'react-redux'
import store from '../../../stores/app'
import storageModel from '../../../stores/storageModel'
import initStore from '../../../test-helpers/initStore'
import PinnedCommand from '../PinnedCommand'

afterEach(() => {
  cleanup()
  storageModel.remove('learning')
  vi.useRealTimers()
})

it.each([
  { reps: 0, targetReps: 5, description: 'Practice progress: 0 of 5 repetitions' },
  { reps: 2, targetReps: 8, description: 'Practice progress: 2 of 8 repetitions' },
])('describes saved practice progress as "$description"', async ({ reps, targetReps, description }) => {
  storageModel.set('learning', {
    pinnedCommandId: 'indent',
    progress: { indent: { reps, targetReps } },
  })
  await initStore()

  render(createElement(Provider, { store, children: createElement(PinnedCommand) }))

  expect(screen.getByTestId('pinned-command')).toHaveAccessibleDescription(description)
})
