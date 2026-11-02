import { render, screen } from '@testing-library/react'
import { ReactNode, act, createElement } from 'react'
import { DndProvider } from 'react-dnd'
import { TestBackend } from 'react-dnd-test-backend'
import { Provider } from 'react-redux'
import { TransitionGroup } from 'react-transition-group'
import { importTextActionCreator as importText } from '../../actions/importText'
import linearizeTree from '../../selectors/linearizeTree'
import store from '../../stores/app'
import scrollTopStore from '../../stores/scrollTopStore'
import dispatch from '../../test-helpers/dispatch'
import initStore from '../../test-helpers/initStore'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import TreeNode from '../TreeNode'

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)

/** Supplies the production store and the test drag backend to the row. */
const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(DndProvider, { backend: TestBackend }, createElement(Provider, { store, children }))

/** Positions the seeded thought without mounting the rest of the layout. */
const createTreeNode = (y: number, onExited: () => void) => {
  const [thought] = linearizeTree(store.getState())
  if (!thought) throw new Error('Expected a seeded thought.')
  const positioned = { ...thought, cliff: -1, height: 36, singleLineHeightWithCliff: 36, x: 0, y }
  return createElement(TreeNode, {
    ...positioned,
    key: thought.key,
    thoughtKey: thought.key,
    index: 0,
    viewportHeight: 100,
    viewportBottomOffset: 0,
    treeThoughtsPositioned: [positioned],
    bulletWidth: 20,
    cursorUncleId: null,
    setSize: vi.fn(),
    removeWidth: vi.fn(),
    cliffPaddingStyle: { paddingBottom: 4 },
    dragInProgress: false,
    autofocusDepth: 0,
    editing: false,
    onExited,
  })
}

it.each([
  { visibility: 'still virtualized', scrollTop: 0 },
  { visibility: 'scrolled into view', scrollTop: 1000 },
])('releases a removed row that is $visibility', async ({ scrollTop }) => {
  await dispatch(importText({ text: '- a', preventSetCursor: true }))
  const onExited = vi.fn()
  const row = createTreeNode(1000, onExited)
  const { rerender } = render(createElement(TransitionGroup, null, row), { wrapper })
  await act(vi.runAllTimersAsync)
  expect(screen.queryByText('a')).not.toBeInTheDocument()

  act(() => {
    scrollTopStore.update(scrollTop)
    rerender(createElement(TransitionGroup))
  })
  await act(vi.runAllTimersAsync)

  // TransitionGroup invokes the child's original callback when it releases the keyed row.
  expect(onExited).toHaveBeenCalledTimes(1)
})

it('preserves a row that returns before its exit finishes', async () => {
  await dispatch(importText({ text: '- a', preventSetCursor: true }))
  const onExited = vi.fn()
  const row = createTreeNode(0, onExited)
  const { rerender } = render(createElement(TransitionGroup, null, row), { wrapper })
  await act(vi.runAllTimersAsync)

  rerender(createElement(TransitionGroup))
  rerender(createElement(TransitionGroup, null, row))
  await act(vi.runAllTimersAsync)

  expect(screen.getByText('a')).toBeInTheDocument()
  expect(onExited).not.toHaveBeenCalled()

  rerender(createElement(TransitionGroup))
  await act(vi.runAllTimersAsync)
  expect(onExited).toHaveBeenCalledTimes(1)
})
