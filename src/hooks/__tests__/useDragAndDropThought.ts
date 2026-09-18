import { fireEvent, screen } from '@testing-library/dom'
import { render, renderHook } from '@testing-library/react'
import { PropsWithChildren, act, createElement } from 'react'
import { Provider } from 'react-redux'
import DragThoughtItem from '../../@types/DragThoughtItem'
import DragThoughtZone from '../../@types/DragThoughtZone'
import DropThoughtZone from '../../@types/DropThoughtZone'
import SimplePath from '../../@types/SimplePath'
import { freeThoughtsActionCreator as freeThoughts } from '../../actions/freeThoughts'
import { importTextActionCreator as importText } from '../../actions/importText'
import { longPressActionCreator as longPress } from '../../actions/longPress'
import Alert from '../../components/Alert'
import Editable from '../../components/Editable'
import { HOME_TOKEN, LongPressState } from '../../constants'
import globals from '../../globals'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import dispatch from '../../test-helpers/dispatch'
import initStore from '../../test-helpers/initStore'
import { moveThoughtAtFirstMatchActionCreator as moveThought } from '../../test-helpers/moveThoughtAtFirstMatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import head from '../../util/head'
import useDragAndDropThought from '../useDragAndDropThought'

const dragEndCallbacks = vi.hoisted(() => [] as (() => void)[])
const dropCallbacks = vi.hoisted(() => [] as ((item: unknown, monitor: unknown) => void)[])

vi.mock('react-dnd', async importOriginal => {
  const actual = await importOriginal<typeof import('react-dnd')>()

  return {
    ...actual,
    useDrag: ({ end }: { end?: () => void }) => {
      if (end) dragEndCallbacks.push(end)
      return [{ isDragging: false }, vi.fn(), vi.fn()]
    },
    useDrop: ({ drop }: { drop?: (item: unknown, monitor: unknown) => void }) => {
      if (drop) dropCallbacks.push(drop)
      return [{ canDropThought: false, isDeepHovering: false, isHovering: false }, vi.fn()]
    },
  }
})

vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: true }
})

/** Provides the Redux store to hooks and components under test. */
const wrapper = ({ children }: PropsWithChildren) => createElement(Provider, { store, children })

beforeEach(async () => {
  await initStore()
  globals.suppressCursorAfterTouch = false
  dragEndCallbacks.length = 0
  dropCallbacks.length = 0
})

afterEach(() => {
  globals.suppressCursorAfterTouch = false
})

// https://github.com/cybersemics/em/issues/4839
it('preserves an unrelated cursor when a trailing click fires after drag cleanup', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - b
          - c
      `,
    }),
    setCursor(['a']),
  ])

  const pathB = contextToPath(store.getState(), ['a', 'b']) as SimplePath
  const { container } = render(
    createElement(Provider, {
      store,
      children: createElement(Editable, {
        isEditing: false,
        isVisible: true,
        path: pathB,
        rank: 0,
        simplePath: pathB,
      }),
    }),
  )
  const editableB = container.querySelector('[data-editable]')!

  renderHook(
    () =>
      useDragAndDropThought({
        hoverZone: DropThoughtZone.ThoughtDrop,
        isCursorParent: false,
        isVisible: true,
        path: pathB,
        simplePath: pathB,
      }),
    { wrapper },
  )

  await dispatch([
    longPress({ value: LongPressState.DragInProgress, draggingThoughts: [pathB] }),
    moveThought({ from: ['a', 'b'], to: ['a', 'b'], newRank: 2 }),
  ])

  await act(async () => dragEndCallbacks[0]())
  expect(store.getState().longPress).toBe(LongPressState.Inactive)

  await act(async () => {
    fireEvent.click(editableB)
  })

  expect(store.getState().cursor).toEqual(contextToPath(store.getState(), ['a']))
})

it('renders home as the destination in the move alert when a thought is dropped at the root', async () => {
  await dispatch(
    importText({
      text: `
        - a
          - b
        - c
      `,
    }),
  )

  const state = store.getState()
  const pathB = contextToPath(state, ['a', 'b']) as SimplePath
  const pathC = contextToPath(state, ['c']) as SimplePath

  render(createElement(Provider, { store, children: createElement(Alert) }))

  // wire the drop target onto c, the root-level thought that b is dropped at
  renderHook(
    () =>
      useDragAndDropThought({
        hoverZone: DropThoughtZone.ThoughtDrop,
        isCursorParent: false,
        isVisible: true,
        path: pathC,
        simplePath: pathC,
      }),
    { wrapper },
  )

  const item: DragThoughtItem[] = [{ path: pathB, simplePath: pathB, zone: DragThoughtZone.Thoughts }]
  const monitor = { didDrop: () => false, isOver: () => true, getItem: () => item }

  await act(async () => {
    dropCallbacks[0](item, monitor)
    // the alert is dispatched on a 100ms timeout so that MultiGesture has cleared the error first
    await vi.advanceTimersByTimeAsync(100)
  })

  expect(screen.getByTestId('alert-content').textContent).toBe('"b" moved to home.')
})

// afterId is resolved from the destination's ranked children, the same ordering that newRank and the no-op check are
// resolved from. Resolving it from the rendered order instead returns the dragged thought itself whenever the two
// orderings disagree, which moveThought rejects with "afterId cannot be the moved thought itself".
it('moves a thought dropped past a hidden meta attribute sibling', async () => {
  await dispatch(
    importText({
      text: `
        - a
        - =test
          - foo
        - b
      `,
    }),
  )

  const state = store.getState()
  const pathA = contextToPath(state, ['a']) as SimplePath
  const pathB = contextToPath(state, ['b']) as SimplePath

  renderHook(
    () =>
      useDragAndDropThought({
        hoverZone: DropThoughtZone.ThoughtDrop,
        isCursorParent: false,
        isVisible: true,
        path: pathB,
        simplePath: pathB,
      }),
    { wrapper },
  )

  await dispatch(longPress({ value: LongPressState.DragInProgress, draggingThoughts: [pathA] }))

  const item: DragThoughtItem[] = [{ path: pathA, simplePath: pathA, zone: DragThoughtZone.Thoughts }]
  const monitor = { didDrop: () => false, isOver: () => true, getItem: () => item }

  await act(async () => {
    dropCallbacks[dropCallbacks.length - 1](item, monitor)
  })

  expect(store.getState().error).toBeNull()
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - =test
    - foo
  - a
  - b`)
})

// In a sorted context the rendered order diverges from the rank order, so the rendered previous sibling of the drop
// target can be the dragged thought even though it is not the previous sibling by rank.
it('moves a thought dropped within a sorted context', async () => {
  await dispatch(
    importText({
      text: `
        - =sort
          - Alphabetical
        - b
        - a
        - c
      `,
    }),
  )

  const state = store.getState()
  const pathB = contextToPath(state, ['b']) as SimplePath
  const pathC = contextToPath(state, ['c']) as SimplePath

  renderHook(
    () =>
      useDragAndDropThought({
        hoverZone: DropThoughtZone.ThoughtDrop,
        isCursorParent: false,
        isVisible: true,
        path: pathC,
        simplePath: pathC,
      }),
    { wrapper },
  )

  await dispatch(longPress({ value: LongPressState.DragInProgress, draggingThoughts: [pathB] }))

  const item: DragThoughtItem[] = [{ path: pathB, simplePath: pathB, zone: DragThoughtZone.Thoughts }]
  const monitor = { didDrop: () => false, isOver: () => true, getItem: () => item }

  await act(async () => {
    dropCallbacks[dropCallbacks.length - 1](item, monitor)
  })

  expect(store.getState().error).toBeNull()
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
  - b
  - c`)
})

// A ThoughtDrop places the thought as a sibling of the drop target, so the destination is the target's parent. Its
// children are always loaded, since freeThoughts preserves the children of every expanded thought — but thoughts
// deeper in the destination's subtree may have been freed, leaving the drop target itself pending.
it('moves a thought dropped onto a collapsed thought with freed descendants', async () => {
  const freeThoughtsThreshold = globals.freeThoughtsThreshold
  globals.freeThoughtsThreshold = 0

  try {
    await dispatch([
      importText({
        text: `
          - x
            - c
            - =test
              - foo
            - d
              - d1
                - d1a
        `,
      }),
      // importText leaves the cursor on the last imported thought, which expands its ancestors and preserves their
      // children from freeThoughts. Move the cursor to x so that the thoughts below d are collapsed.
      setCursor(['x']),
      // The freeThoughts middleware is throttled, so dispatch it directly to free the collapsed thoughts below d.
      freeThoughts(),
    ])

    const state = store.getState()
    const pathC = contextToPath(state, ['x', 'c']) as SimplePath
    const pathD = contextToPath(state, ['x', 'd']) as SimplePath

    // Assert that freeThoughts deallocated d1a and marked d1 pending, so that the test cannot silently degrade into a
    // drop onto a fully loaded subtree.
    expect(state.thoughts.thoughtIndex[head(contextToPath(state, ['x', 'd', 'd1']) as SimplePath)].pending).toBe(true)

    renderHook(
      () =>
        useDragAndDropThought({
          hoverZone: DropThoughtZone.ThoughtDrop,
          isCursorParent: false,
          isVisible: true,
          path: pathD,
          simplePath: pathD,
        }),
      { wrapper },
    )

    await dispatch(longPress({ value: LongPressState.DragInProgress, draggingThoughts: [pathC] }))

    const item: DragThoughtItem[] = [{ path: pathC, simplePath: pathC, zone: DragThoughtZone.Thoughts }]
    const monitor = { didDrop: () => false, isOver: () => true, getItem: () => item }

    await act(async () => {
      dropCallbacks[dropCallbacks.length - 1](item, monitor)
    })

    expect(store.getState().error).toBeNull()
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - x
    - =test
      - foo
    - c
    - d
      - d1`)
  } finally {
    globals.freeThoughtsThreshold = freeThoughtsThreshold
  }
})
