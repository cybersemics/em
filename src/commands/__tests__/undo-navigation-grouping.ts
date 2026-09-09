import { cursorDownActionCreator as cursorDown } from '../../actions/cursorDown'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { undoActionCreator as undo } from '../../actions/undo'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import headValue from '../../util/headValue'

beforeEach(initStore)

it('undoes a trailing navigation action together with the navigation action before it', () => {
  store.dispatch([
    importText({
      text: `
        - a
        - b
        - c`,
    }),
    setCursor(['a']),
    // create a thought and type its value, so that the navigation that follows has a non-navigation action to attach to
    newThought({ value: '' }),
    editThought([''], 'x'),
    cursorDown(),
    // create a second thought and type its value
    newThought({ value: '' }),
    editThought([''], 'y'),
  ])

  expect(headValue(store.getState(), store.getState().cursor!)).toBe('y')

  // undo the second thought and its value in one step. This also resets the merge tracking, so the next navigation
  // starts its own history entry instead of merging with the cursorDown before it.
  store.dispatch(undo())

  expect(headValue(store.getState(), store.getState().cursor!)).toBe('b')

  // move the cursor again, leaving the two newest history entries both navigation-only
  store.dispatch(cursorDown())

  expect(headValue(store.getState(), store.getState().cursor!)).toBe('c')

  // undo reverts both navigation entries, restoring the cursor to the thought that was edited before them
  store.dispatch(undo())

  expect(headValue(store.getState(), store.getState().cursor!)).toBe('x')

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
  - x
  - b
  - c`)
})
