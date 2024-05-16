import State from '../@types/State'
import Thunk from '../@types/Thunk'
import deleteAttribute from '../actions/deleteAttribute'
import setDescendant from '../actions/setDescendant'
import setNoteFocus from '../actions/setNoteFocus'
import attribute from '../selectors/attribute'
import findDescendant from '../selectors/findDescendant'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'

/** Toggle the caret between the cursor and its note. Set the selection to the end. If the note is empty, delete it. */
const toggleNote = (state: State) => {
  const thoughtId = head(state.cursor!)
  const hasNote = findDescendant(state, thoughtId, '=note')

  return reducerFlow([
    // create an empty note if it doesn't exist
    !hasNote
      ? setDescendant({
          path: state.cursor!,
          values: ['=note', ''],
        })
      : // delete an empty note that already exists
        state.noteFocus && !attribute(state, thoughtId, '=note')
        ? deleteAttribute({ path: state.cursor!, value: '=note' })
        : null,

    // toggle state.noteFocus, which will trigger the Editable and Note to re-render and set the selection appropriately
    setNoteFocus({ value: !state.noteFocus }),
  ])(state)
}

/** Action-creator for toggleNote. */
export const toggleNoteActionCreator = (): Thunk => dispatch => dispatch({ type: 'toggleNote' })

export default toggleNote
