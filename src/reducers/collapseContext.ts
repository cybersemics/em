import { head, parentOf, pathToContext, reducerFlow, unroot } from '../util'
import { State } from '../util/initialState'
import { getAllChildren, simplifyPath } from '../selectors'
import { archiveThought, existingThoughtMove, setCursor } from '../reducers'
import _ from 'lodash'
import existingThoughtDelete from './existingThoughtDelete'
import { Path } from '../types'

interface Options {
  deleteCursor?: boolean,
  at?: Path | null,
}

/** Collapses the active thought. */
const collapseContext = (state: State, { deleteCursor, at }: Options) => {
  const { cursor } = state

  if (!cursor) return state

  const simpleCursor = simplifyPath(state, cursor)
  const simpleContext = pathToContext(simpleCursor)

  const children = getAllChildren(state, simpleContext)

  return reducerFlow(
    children.length > 0 ? [
      ...children.map(child =>
        existingThoughtMove({
          oldPath: unroot([...cursor, child]),
          newPath: unroot([...parentOf(cursor), child]),
        })
      ),
      !deleteCursor
        ? archiveThought({ path: cursor }) :
        existingThoughtDelete({
          context: parentOf(simpleContext),
          thoughtRanked: head(simpleCursor)
        }),
      setCursor({
        path: at !== undefined ? at : unroot([...parentOf(cursor), children[0]]),
        editing: state.editing,
        offset: 0
      }),
    ] : []
  )(state)
}

export default _.curryRight(collapseContext)
