import { State } from '../@types'
import { deleteThought, setAttribute } from '../reducers'
import { getAllChildren, simplifyPath } from '../selectors'
import { HeadingLevel } from '../shortcuts/headings'
import { pathToContext, reducerFlow } from '../util'

/** Set or remove a heading on the cursor. */
const heading = (state: State, { level }: { level: HeadingLevel }): State => {
  const context = pathToContext(simplifyPath(state, state.cursor!))
  const headingChildren = getAllChildren(state, context).filter(child => /^=heading[1-9]$/.test(child.value))
  return reducerFlow([
    // delete other headings
    ...headingChildren.map(child =>
      deleteThought({
        context,
        thoughtRanked: child,
      }),
    ),

    // set new heading
    level > 0 ? setAttribute({ context, key: `=heading${level}` }) : null,
  ])(state)
}

export default heading
