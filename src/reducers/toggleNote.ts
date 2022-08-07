import State from '../@types/State'
import deleteAttribute from '../reducers/deleteAttribute'
import setAttribute from '../reducers/setAttribute'
import setNoteFocus from '../reducers/setNoteFocus'
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
      ? setAttribute({
          path: state.cursor!,
          values: ['=note', ''],
        })
      : // delete an empty note that already exists
      state.noteFocus && !attribute(state, thoughtId, '=note')
      ? deleteAttribute({ path: state.cursor!, key: '=note' })
      : null,

    // toggle state.noteFocus, which will trigger the Editable and Note to re-render and set the selection appropriately
    setNoteFocus({ value: !state.noteFocus }),
  ])(state)
}

export default toggleNote
