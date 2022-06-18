import head from '../util/head'
import normalizeThought from '../util/normalizeThought'
import parentOf from '../util/parentOf'
import pathToContext from '../util/pathToContext'
import reducerFlow from '../util/reducerFlow'
import unroot from '../util/unroot'
import getRankBefore from '../selectors/getRankBefore'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import archiveThought from '../reducers/archiveThought'
import moveThought from '../reducers/moveThought'
import setCursor from '../reducers/setCursor'
import _ from 'lodash'
import deleteThought from './deleteThought'
import Path from '../@types/Path'
import State from '../@types/State'
import { getChildren, isChildVisible, getAllChildrenAsThoughts } from '../selectors/getChildren'

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

  const children = getAllChildrenAsThoughts(state, head(simpleCursor))

  /** Returns first moved child path as new cursor after collapse. */
  const getNewCursor = (updatedState: State) => {
    const firstVisibleChildOfPrevCursor = (
      state.showHiddenThoughts ? children : children.filter(isChildVisible(state))
    )[0]

    const childrenOfMovedContext = getChildren(updatedState, head(rootedParentOf(updatedState, simpleCursor)))

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
