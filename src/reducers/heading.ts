import deleteThought from '../reducers/deleteThought'
import setAttribute from '../reducers/setAttribute'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import { HeadingLevel } from '../shortcuts/headings'
import State from '../@types/State'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'

/** Set or remove a heading on the cursor. */
const heading = (state: State, { level }: { level: HeadingLevel }): State => {
  if (!state.cursor) return state
  const path = simplifyPath(state, state.cursor)
  const headingChildren = getAllChildrenAsThoughts(state, head(state.cursor)).filter(child =>
    /^=heading[1-9]$/.test(child.value),
  )
  return reducerFlow([
    // delete other headings
    ...headingChildren.map(thought =>
      deleteThought({
        pathParent: simplifyPath(state, state.cursor!),
        thoughtId: thought.id,
      }),
    ),

    // set new heading
    level > 0 ? setAttribute({ path, key: `=heading${level}` }) : null,
  ])(state)
}

export default heading
