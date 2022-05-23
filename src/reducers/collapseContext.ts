import { head, normalizeThought, parentOf, pathToContext, reducerFlow, unroot } from '../util'
import { getChildren, getRankBefore, isChildVisible, rootedParentOf, simplifyPath } from '../selectors'
import { archiveThought, moveThought, setCursor } from '../reducers'
import _ from 'lodash'
import deleteThought from './deleteThought'
import { Path, State } from '../@types'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'

interface Options {
  deleteCursor?: boolean
  at?: Path | null
}

/** Collapses the active thought. */
const collapseContext = (state: State, { deleteCursor, at }: Options) => {
  const { cursor } = state

  const path = at || cursor

  if (!path) return state

  const simpleCursor = simplifyPath(state, path)
  const context = pathToContext(state, simpleCursor)

  const children = getAllChildrenAsThoughts(state, context)

  /** Returns first moved child path as new cursor after collapse. */
  const getNewCursor = (updatedState: State) => {
    const firstVisibleChildOfPrevCursor = (
      state.showHiddenThoughts ? children : children.filter(isChildVisible(state))
    )[0]

    const childrenOfMovedContext = getChildren(updatedState, rootedParentOf(updatedState, context))

    if (!firstVisibleChildOfPrevCursor) return unroot([...parentOf(path)])

    const normalizedFirstChildValue = normalizeThought(firstVisibleChildOfPrevCursor.value)

    const newChild =
      childrenOfMovedContext.find(child => normalizeThought(child.value) === normalizedFirstChildValue) ||
      childrenOfMovedContext[0]

    return unroot([...parentOf(path), newChild.id])
  }

  return reducerFlow(
    children.length > 0
      ? [
          ...children.map(child => {
            return (updatedState: State) =>
              moveThought(updatedState, {
                oldPath: unroot([...path, child.id]),
                newPath: unroot([...parentOf(path), child.id]),
                newRank: getRankBefore(updatedState, simpleCursor),
              })
          }),
          !deleteCursor
            ? archiveThought({ path })
            : deleteThought({
                context: parentOf(context),
                thoughtId: head(simpleCursor),
              }),
          state =>
            setCursor(state, {
              path: getNewCursor(state),
              editing: state.editing,
              offset: 0,
            }),
        ]
      : [],
  )(state)
}

export default _.curryRight(collapseContext)
