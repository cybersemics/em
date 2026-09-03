import { fireEvent } from '@testing-library/dom'
import { render, renderHook } from '@testing-library/react'
import { PropsWithChildren, act, createElement } from 'react'
import { Provider } from 'react-redux'
import DropThoughtZone from '../../@types/DropThoughtZone'
import SimplePath from '../../@types/SimplePath'
import { importTextActionCreator as importText } from '../../actions/importText'
import { longPressActionCreator as longPress } from '../../actions/longPress'
import Editable from '../../components/Editable'
import { LongPressState } from '../../constants'
import globals from '../../globals'
import contextToPath from '../../selectors/contextToPath'
import store from '../../stores/app'
import dispatch from '../../test-helpers/dispatch'
import initStore from '../../test-helpers/initStore'
import { moveThoughtAtFirstMatchActionCreator as moveThought } from '../../test-helpers/moveThoughtAtFirstMatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import useDragAndDropThought from '../useDragAndDropThought'

const dragEndCallbacks = vi.hoisted(() => [] as (() => void)[])

vi.mock('react-dnd', async importOriginal => {
  const actual = await importOriginal<typeof import('react-dnd')>()

  return {
    ...actual,
    useDrag: ({ end }: { end?: () => void }) => {
      if (end) dragEndCallbacks.push(end)
      return [{ isDragging: false }, vi.fn(), vi.fn()]
    },
    useDrop: () => [{ canDropThought: false, isDeepHovering: false, isHovering: false }, vi.fn()],
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
