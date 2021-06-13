import { head, normalizeThought, parentOf, pathToContext, reducerFlow, unroot } from '../util'
import { State } from '../util/initialState'
import { getAllChildren, getChildren, getRankBefore, isChildVisible, rootedParentOf, simplifyPath } from '../selectors'
import { archiveThought, moveThought, setCursor } from '../reducers'
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

  /** Returns first moved child path as new cursor after collapse. */
  const getNewCursor = (updatedState: State) => {

    const firstVisibleChildOfPrevCursor = (state.showHiddenThoughts
      ? children
      : children.filter(isChildVisible(state, context)))[0]

    const childrenOfMovedContext = getChildren(updatedState, rootedParentOf(updatedState, context))

    if (!firstVisibleChildOfPrevCursor) return unroot([...parentOf(path)])

    const normalizedFirstChildValue = normalizeThought(firstVisibleChildOfPrevCursor.value)

    const newChild = childrenOfMovedContext.find(child => normalizeThought(child.value) === normalizedFirstChildValue) || childrenOfMovedContext[0]

    return unroot([...parentOf(path), newChild])
  }

  return reducerFlow(
    children.length > 0 ? [
      ...children.map(child => {
        return (updatedState: State) => moveThought(updatedState, {
          oldPath: unroot([...path, child]),
          newPath: unroot([...parentOf(path), { ...child, rank: getRankBefore(updatedState, simpleCursor) }]),
        })
      }
      ),
      !deleteCursor
        ? archiveThought({ path }) :
        existingThoughtDelete({
          context: parentOf(context),
          thoughtRanked: head(simpleCursor)
        }),
      state => setCursor(state, {
        path: getNewCursor(state),
        editing: state.editing,
        offset: 0
      }),
    ] : []
  )(state)
}

export default _.curryRight(collapseContext)
