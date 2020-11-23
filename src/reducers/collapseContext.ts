import { parentOf, pathToContext, reducerFlow, unroot } from '../util'
import { State } from '../util/initialState'
import { getChildren } from '../selectors'
import { archiveThought, existingThoughtMove, setCursor } from '../reducers'

/** Collapses the active thought. */
const collapseContext = (state: State) => {
  const { cursor } = state

  if (!cursor) return state

  const children = getChildren(state, pathToContext(cursor))

  return reducerFlow(
    children.length > 0 ? [
      ...children.map(child =>
        existingThoughtMove({
          oldPath: unroot([...cursor, child]),
          newPath: unroot([...parentOf(cursor), child]),
        })
      ),
      archiveThought({ path: cursor }),
      setCursor({
        path: unroot([...parentOf(cursor), children[0]]),
        editing: state.editing,
        offset: 0
      }),
    ] : []
  )(state)
}

export default collapseContext
