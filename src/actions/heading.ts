import State from '../@types/State'
import Thunk from '../@types/Thunk'
import deleteThought from '../actions/deleteThought'
import setDescendant from '../actions/setDescendant'
import { filterAllChildren } from '../selectors/getChildren'
import simplifyPath from '../selectors/simplifyPath'
import { HeadingLevel } from '../shortcuts/headings'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'

/** Set or remove a heading on the cursor. */
const heading = (state: State, { level }: { level: HeadingLevel }): State => {
  if (!state.cursor) return state
  const path = simplifyPath(state, state.cursor)
  const headingChildren = filterAllChildren(state, head(state.cursor), child => /^=heading[1-9]$/.test(child.value))
  return reducerFlow([
    // delete other headings
    ...headingChildren.map(thought =>
      deleteThought({
        pathParent: simplifyPath(state, state.cursor!),
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
