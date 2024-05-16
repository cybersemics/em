import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import alert from '../actions/alert'
import moveThought from '../actions/moveThought'
import setCursor from '../actions/setCursor'
import { getChildren, getChildrenRanked, isVisible } from '../selectors/getChildren'
import getRankBefore from '../selectors/getRankBefore'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import createId from '../util/createId'
import head from '../util/head'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import deleteThought from './deleteThought'
import editThought from './editThought'

interface Options {
  at?: Path | null
}

/** Deletes a thought and moves all its children to its parent. */
const collapseContext = (state: State, { at }: Options) => {
  const { cursor } = state

  const path = at || cursor

  if (!path) return state

  if (isContextViewActive(state, parentOf(path))) {
    return alert(state, {
      value: `Contexts may not be collapsed in the context view.`,
    })
  }

  const simplePath = simplifyPath(state, path)
  const children = getChildrenRanked(state, head(simplePath))

  if (children.length === 0) return state

  /** Returns first moved child path as new cursor after collapse. */
  const getNewCursor = (state: State): Path | null => {
    const firstVisibleChildOfPrevCursor = (state.showHiddenThoughts ? children : children.filter(isVisible(state)))[0]

    if (!firstVisibleChildOfPrevCursor) return path.length > 1 ? parentOf(path) : null

    const parentId = head(rootedParentOf(state, simplePath))
    const childrenOfMovedContext = getChildren(state, parentId)

    const newChild =
      childrenOfMovedContext.find(child => child.id === firstVisibleChildOfPrevCursor.id) || childrenOfMovedContext[0]

    return newChild ? appendToPath(parentOf(path), newChild.id) : null
  }

  const thought = getThoughtById(state, head(simplePath))
  const rankStart = getRankBefore(state, simplePath)
  const rankIncrement = (thought.rank - rankStart) / children.length

  return reducerFlow([
    // first edit the collapsing thought to a unique value
    // otherwise, it could get merged when children are outdented in the next step
    editThought({
      oldValue: thought.value,
      newValue: createId(), // unique value
      path: simplePath,
    }),
    // outdent each child
    ...children.map((child, i) =>
      moveThought({
        oldPath: appendToPath(simplePath, child.id),
        newPath: appendToPath(parentOf(simplePath), child.id),
        newRank: rankStart + rankIncrement * i,
      }),
    ),
    // delete the original cursor
    deleteThought({
      pathParent: parentOf(simplePath),
      thoughtId: head(simplePath),
    }),
    // set the new cursor
    state =>
      setCursor(state, {
        path: getNewCursor(state),
        editing: state.editing,
        offset: 0,
      }),
  ])(state)
}

/** Action-creator for collapseContext. */
export const collapseContextActionCreator =
  (payload: Parameters<typeof collapseContext>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'collapseContext', ...payload })

export default _.curryRight(collapseContext)
