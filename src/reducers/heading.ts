import { deleteThought, setAttribute } from '../reducers'
import { simplifyPath } from '../selectors'
import { head, pathToContext, reducerFlow } from '../util'
import { HeadingLevel } from '../shortcuts/headings'
import { State } from '../@types'
import { getAllChildrenAsThoughtsById } from '../selectors/getChildren'

/** Set or remove a heading on the cursor. */
const heading = (state: State, { level }: { level: HeadingLevel }): State => {
  if (!state.cursor) return state
  const context = pathToContext(state, simplifyPath(state, state.cursor))
  const headingChildren = getAllChildrenAsThoughtsById(state, head(state.cursor)).filter(child =>
    /^=heading[1-9]$/.test(child.value),
  )
  return reducerFlow([
    // delete other headings
    ...headingChildren.map(thought =>
      deleteThought({
        context,
        thoughtId: thought.id,
      }),
    ),

    // set new heading
    level > 0 ? setAttribute({ context, key: `=heading${level}` }) : null,
  ])(state)
}

export default heading
