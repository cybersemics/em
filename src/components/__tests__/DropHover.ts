import { act } from 'react'
import DragThoughtZone from '../../@types/DragThoughtZone'
import DropThoughtZone from '../../@types/DropThoughtZone'
import { importTextActionCreator as importText } from '../../actions/importText'
import { longPressActionCreator as longPress } from '../../actions/longPress'
import { toggleContextViewActionCreator as toggleContextView } from '../../actions/toggleContextView'
import { updateHoveringPathActionCreator as updateHoveringPath } from '../../actions/updateHoveringPath'
import { LongPressState } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import simplifyPath from '../../selectors/simplifyPath'
import store from '../../stores/app'
import contextToPathOrThrow from '../../test-helpers/contextToPathOrThrow'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('shows only the alphabetical insertion position when dragging into another context', async () => {
  await dispatch([
    importText({ text: '- b\n- parent\n  - =sort\n    - Alphabetical\n      - Asc\n  - a\n  - c\n  - f' }),
    setCursor(['parent']),
  ])
  await act(vi.runOnlyPendingTimersAsync)
  expect(document.querySelectorAll('.drop-hover')).toHaveLength(0)

  const state = store.getState()
  await dispatch(
    longPress({
      value: LongPressState.DragInProgress,
      draggingThoughts: [contextToPathOrThrow(state, ['b'], 'DropHover')],
      hoverZone: DropThoughtZone.SubthoughtsDrop,
      sourceZone: DragThoughtZone.Thoughts,
    }),
  )
  await act(vi.runOnlyPendingTimersAsync)
  await dispatch(updateHoveringPath({ path: contextToPathOrThrow(state, ['parent'], 'DropHover') }))

  const hovers = document.querySelectorAll('.drop-hover')
  expect(hovers).toHaveLength(1)
  expect(hovers[0].closest('[aria-label="tree-node"]')?.querySelector('[data-editable]')).toHaveTextContent('c')

  await dispatch(longPress({ value: LongPressState.Inactive }))
  await act(vi.runOnlyPendingTimersAsync)
  expect(document.querySelectorAll('.drop-hover')).toHaveLength(0)
})

// https://github.com/cybersemics/em/issues/5089
it('no error is logged when a thought in a cyclic context is dragged over the thought the context view is on', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - m
            - x
        - b
          - m
            - y
      `,
    }),
    setCursor(['a', 'm']),
    toggleContextView(),
    setCursor(['a', 'm', 'a']),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const state = store.getState()
  const pathX = contextToPath(state, ['a', 'm', 'a', 'x'])
  const pathM = contextToPath(state, ['a', 'm'])
  if (!pathX || !pathM) throw new Error('Expected the context view of a/m to render x in the cyclic context a/m~/a')

  // beginDrag stores the simplified path of the dragged thought, so dragging a/m~/a/x adds a/m/x to draggingThoughts.
  // Its parent a/m is the very path the context view is active on, which is what makes the context view ambiguous.
  const simplePathX = simplifyPath(state, pathX)
  expectPathToEqual(state, simplePathX, ['a', 'm', 'x'])
  expectPathToEqual(state, pathM, ['a', 'm'])

  const consoleError = vi.spyOn(console, 'error')

  // drag a/m~/a/x over a/m without releasing
  await dispatch(
    longPress({
      value: LongPressState.DragInProgress,
      draggingThoughts: [simplePathX],
      hoveringPath: pathM,
      hoverZone: DropThoughtZone.ThoughtDrop,
      sourceZone: DragThoughtZone.Thoughts,
    }),
  )

  await act(vi.runOnlyPendingTimersAsync)

  expect(consoleError.mock.calls).toEqual([])

  consoleError.mockRestore()
})
