import State from '../@types/State'
import Thunk from '../@types/Thunk'
import deleteThought from '../actions/deleteThought'
import setDescendant from '../actions/setDescendant'
import { HeadingLevel } from '../commands/headings'
import { filterAllChildren } from '../selectors/getChildren'
import parentContextPath from '../selectors/parentContextPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'

/** Set or remove a heading on the cursor. */
const heading = (state: State, { level }: { level: HeadingLevel }): State => {
  if (!state.cursor) return state
  // A heading styles the thought the user sees, so in the context view it is set on the context rather than on the
  // Lexeme context.
  const path = parentContextPath(state, state.cursor)
  const headingChildren = filterAllChildren(state, head(path), child => /^=heading[1-9]$/.test(child.value))
  return reducerFlow([
    // delete other headings
    ...headingChildren.map(thought =>
      deleteThought({
        pathParent: path,
        thoughtId: thought.id,
      }),
    ),

    // set new heading
    level > 0 ? setDescendant({ path, values: [`=heading${level}`] }) : null,
  ])(state)
}

/** Action-creator for heading. */
export const headingActionCreator =
  (payload: Parameters<typeof heading>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'heading', ...payload })

export default heading

// Register this action's metadata
registerActionMetadata('heading', {
  undoable: true,
})
