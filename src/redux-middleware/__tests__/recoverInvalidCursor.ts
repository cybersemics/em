import { importTextActionCreator as importText } from '../../actions/importText'
import { setIsMulticursorExecutingActionCreator as setIsMulticursorExecuting } from '../../actions/setIsMulticursorExecuting'
import { toggleDropdownActionCreator as toggleDropdown } from '../../actions/toggleDropdown'
import { initialize } from '../../initialize'
import contextToPath from '../../selectors/contextToPath'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { moveThoughtAtFirstMatchActionCreator as moveThought } from '../../test-helpers/moveThoughtAtFirstMatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import { toggleMulticursorAtFirstMatchActionCreator as toggleMulticursor } from '../../test-helpers/toggleMulticursorAtFirstMatch'

// The multiselect drop below only strands the cursor on touch, where multiselectCursorMiddleware parks the cursor while
// thoughts are selected and lands it on the first selected thought when the selection ends.
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: true }
})

beforeEach(initStore)

it('moves an invalid cursor back to the last valid cursor', async () => {
  await initialize({ storage: 'memory' })

  store.dispatch([
    importText({
      text: `
        - g
          - a
            - x
              - x1
            - y
          - b
            - r`,
    }),
    setCursor(['g', 'a', 'x']),
  ])

  // long press x, then tap y to add it to the multiselect, which parks the cursor on a
  store.dispatch([toggleMulticursor(['g', 'a', 'x']), toggleMulticursor(['g', 'a', 'y'])])

  // drop the selection into r, as the subthought drop does
  store.dispatch([
    setIsMulticursorExecuting({ value: true, undoLabel: 'Dragging Thoughts' }),
    moveThought({ from: ['g', 'a', 'x'], to: ['g', 'b', 'r', 'x'], newRank: -2 }),
    moveThought({ from: ['g', 'a', 'y'], to: ['g', 'b', 'r', 'y'], newRank: -1 }),
    setIsMulticursorExecuting({ value: false }),
  ])

  // Close the Command Center, which ends the multiselect. If the cursor is landed on x where it was selected rather
  // than where it was dropped, it is moved back to a, where it was parked.
  store.dispatch(toggleDropdown({ dropDownType: 'commandCenter', value: false }))

  const state = store.getState()
  expect(state.cursor).toEqual(contextToPath(state, ['g', 'a']))
})
