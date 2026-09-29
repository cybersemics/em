import { act } from 'react'
import DragThoughtZone from '../../@types/DragThoughtZone'
import DropThoughtZone from '../../@types/DropThoughtZone'
import { importTextActionCreator as importText } from '../../actions/importText'
import { longPressActionCreator as longPress } from '../../actions/longPress'
import { toggleContextViewActionCreator as toggleContextView } from '../../actions/toggleContextView'
import { LongPressState } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import simplifyPath from '../../selectors/simplifyPath'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

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
