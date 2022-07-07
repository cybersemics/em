import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import moveThought from '../reducers/moveThought'
import setCursor from '../reducers/setCursor'
import { getAllChildrenAsThoughts, getChildren, isChildVisible } from '../selectors/getChildren'
import getRankBefore from '../selectors/getRankBefore'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import normalizeThought from '../util/normalizeThought'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import unroot from '../util/unroot'
import deleteThought from './deleteThought'

interface Options {
  at?: Path | null
}

/** Collapses the active thought. */
const collapseContext = (state: State, { at }: Options) => {
  const { cursor } = state

  const path = at || cursor

  if (!path) return state

  const simpleCursor = simplifyPath(state, path)

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
          deleteThought({
            pathParent: parentOf(simpleCursor),
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
