import { head, parentOf, pathToContext, reducerFlow, unroot } from '../util'
import { State } from '../util/initialState'
import { getAllChildren, simplifyPath } from '../selectors'
import { archiveThought, existingThoughtMove, setCursor } from '../reducers'
import _ from 'lodash'
import existingThoughtDelete from './existingThoughtDelete'

interface Options {
  preventCursorArchive?: boolean,
}

/** Collapses the active thought. */
const collapseContext = (state: State, { preventCursorArchive }: Options) => {
  const { cursor } = state

  if (!cursor) return state

  const simpleCursor = simplifyPath(state, cursor)

  const children = getAllChildren(state, pathToContext(cursor))

  return reducerFlow(
    children.length > 0 ? [
      ...children.map(child =>
        existingThoughtMove({
          oldPath: unroot([...cursor, child]),
          newPath: unroot([...parentOf(cursor), child]),
        })
      ),
      !preventCursorArchive
        ? archiveThought({ path: cursor }) :
        existingThoughtDelete({
          context: parentOf(pathToContext(cursor)),
          showContexts: false,
          thoughtRanked: head(simpleCursor)
        }),
      setCursor({
        path: unroot([...parentOf(cursor), children[0]]),
        editing: state.editing,
        offset: 0
      }),
    ] : []
  )(state)
}

export default _.curryRight(collapseContext)
