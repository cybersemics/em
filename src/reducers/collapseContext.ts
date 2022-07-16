import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import moveThought from '../reducers/moveThought'
import setCursor from '../reducers/setCursor'
import { getAllChildrenAsThoughts, getChildren, isChildVisible } from '../selectors/getChildren'
import getRankBefore from '../selectors/getRankBefore'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import createId from '../util/createId'
import head from '../util/head'
import normalizeThought from '../util/normalizeThought'
import parentOf from '../util/parentOf'
import pathToContext from '../util/pathToContext'
import reducerFlow from '../util/reducerFlow'
import unroot from '../util/unroot'
import deleteThought from './deleteThought'
import editThought from './editThought'

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

    const parentId = head(rootedParentOf(updatedState, simpleCursor))
    const childrenOfMovedContext = getChildren(updatedState, parentId)

    if (!firstVisibleChildOfPrevCursor) return unroot([...parentOf(path)])

    const normalizedFirstChildValue = normalizeThought(firstVisibleChildOfPrevCursor.value)

    const newChild =
      childrenOfMovedContext.find(child => normalizeThought(child.value) === normalizedFirstChildValue) ||
      childrenOfMovedContext[0]

    return unroot([...parentOf(path), newChild.id])
  }

  const thought = getThoughtById(state, head(simpleCursor))

  return reducerFlow(
    children.length > 0
      ? [
          // first edit the collapsing thought to a unique value
          // otherwise, it could get merged when children are outdented in the next step
          editThought({
            oldValue: thought.value,
            newValue: createId(), // unique value
            context: pathToContext(state, simpleCursor),
            path: simpleCursor,
          }),
          // outdent each child
          ...children.map(
            child => (updatedState: State) =>
              moveThought(updatedState, {
                oldPath: unroot([...path, child.id]),
                newPath: unroot([...parentOf(path), child.id]),
                newRank: getRankBefore(updatedState, simpleCursor),
              }),
          ),
          // delete the original cursor
          deleteThought({
            pathParent: parentOf(simpleCursor),
            thoughtId: head(simpleCursor),
          }),
          // set the new cursor
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
