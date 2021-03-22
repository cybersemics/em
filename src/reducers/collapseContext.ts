import { head, parentOf, pathToContext, reducerFlow, unroot } from '../util'
import { State } from '../util/initialState'
import { getAllChildren, isChildVisible, simplifyPath } from '../selectors'
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

  const path = at || cursor

  if (!path) return state

  const simpleCursor = simplifyPath(state, path)
  const context = pathToContext(simpleCursor)

  const children = getAllChildren(state, context)

  /** Returns new cursor after collapse. */
  const getNewCursor = () => {
    const visibleChildren = state.showHiddenThoughts
      ? children
      : children.filter(isChildVisible(state, context))

    return unroot([...parentOf(path), ...visibleChildren.length > 0 ? [visibleChildren[0]] : []])
  }

  return reducerFlow(
    children.length > 0 ? [
      ...children.map(child =>
        existingThoughtMove({
          oldPath: unroot([...path, child]),
          newPath: unroot([...parentOf(path), child]),
        })
      ),
      !deleteCursor
        ? archiveThought({ path }) :
        existingThoughtDelete({
          context: parentOf(context),
          thoughtRanked: head(simpleCursor)
        }),
      setCursor({
        path: getNewCursor(),
        editing: state.editing,
        offset: 0
      }),
    ] : []
  )(state)
}

export default _.curryRight(collapseContext)
