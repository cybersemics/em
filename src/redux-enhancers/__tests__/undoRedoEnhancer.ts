import { importTextActionCreator as importText } from '../../actions/importText'
import { setCursorActionCreator as setCursorPath } from '../../actions/setCursor'
import { initialize } from '../../initialize'
import contextToPath from '../../selectors/contextToPath'
import store from '../../stores/app'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import { toggleMulticursorAtFirstMatchActionCreator as toggleMulticursor } from '../../test-helpers/toggleMulticursorAtFirstMatch'

// The cursor is only parked at the selected thoughts' common ancestor on touch devices (see multiselectCursorMiddleware).
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: true }
})

beforeEach(initStore)

it('ending a multiselect after reselecting a different anchor does not throw (Error applying patch)', async () => {
  await initialize({ storage: 'memory' })

  store.dispatch([
    importText({
      text: `
        - x
          - a
          - b
            - =note
              - note
          - c`,
    }),
    setCursor(['x', 'a']),
    editThought(['x', 'a'], 'aa'),
  ])

  // long press c, then tap aa to add it to the multiselect
  store.dispatch([toggleMulticursor(['x', 'c']), toggleMulticursor(['x', 'aa'])])

  // tap the note of b, which ends the multiselect
  store.dispatch((dispatch, getState) =>
    dispatch(setCursorPath({ path: contextToPath(getState(), ['x', 'b'])!, noteFocus: true })),
  )

  // long press aa, then tap c to add it to the multiselect
  store.dispatch([toggleMulticursor(['x', 'aa']), toggleMulticursor(['x', 'c'])])

  // tap c and then aa to deselect them, which ends the multiselect
  expect(() => store.dispatch([toggleMulticursor(['x', 'c']), toggleMulticursor(['x', 'aa'])])).not.toThrow()

  expectPathToEqual(store.getState(), store.getState().cursor, ['x', 'aa'])
})
