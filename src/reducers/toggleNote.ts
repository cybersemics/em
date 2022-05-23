import { attribute, hasChild } from '../selectors'
import { deleteAttribute, setAttribute, setNoteFocus } from '../reducers'
import { head, pathToContext, reducerFlow } from '../util'
import { State } from '../@types/State'

/** Toggle the caret between the cursor and its note. Set the selection to the end. If the note is empty, delete it. */
const toggleNote = (state: State) => {
  const context = pathToContext(state, state.cursor!)
  const thoughtId = head(state.cursor!)
  const hasNote = hasChild(state, thoughtId, '=note')

  return reducerFlow([
    // create an empty note if it doesn't exist
    !hasNote
      ? setAttribute({
          context,
          key: '=note',
          value: '',
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
