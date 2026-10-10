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

// The cursor is only parked at the selected thoughts' common ancestor on touch devices (see multiselectCursorMiddleware).
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: true }
})

beforeEach(initStore)

it('lands the cursor on the first selected thought at its new location when the selection ends after the thoughts were moved', async () => {
  await initialize({ storage: 'memory' })

  store.dispatch([
    importText({
      text: `
        - g
          - a
            - x
              - x1
            - y
            - z
          - b
            - r
              - r1`,
    }),
    setCursor(['g', 'a', 'x']),
  ])

  // long press x, then tap y and z to add them to the multiselect
  store.dispatch([
    toggleMulticursor(['g', 'a', 'x']),
    toggleMulticursor(['g', 'a', 'y']),
    toggleMulticursor(['g', 'a', 'z']),
  ])

  // drop the selection into the collapsed cousin r, as the subthought drop does
  store.dispatch([
    setIsMulticursorExecuting({ value: true, undoLabel: 'Dragging Thoughts' }),
    moveThought({ from: ['g', 'a', 'x'], to: ['g', 'b', 'r', 'x'], after: null }),
    moveThought({ from: ['g', 'a', 'y'], to: ['g', 'b', 'r', 'y'], after: ['g', 'b', 'r', 'x'] }),
    moveThought({ from: ['g', 'a', 'z'], to: ['g', 'b', 'r', 'z'], after: ['g', 'b', 'r', 'y'] }),
    setIsMulticursorExecuting({ value: false }),
  ])

  // close the Command Center, which ends the multiselect
  store.dispatch(toggleDropdown({ dropDownType: 'commandCenter', value: false }))

  const state = store.getState()
  expect(state.cursor).toEqual(contextToPath(state, ['g', 'b', 'r', 'x']))
})
