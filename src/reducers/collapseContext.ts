import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import alert from '../reducers/alert'
import moveThought from '../reducers/moveThought'
import setCursor from '../reducers/setCursor'
import { getAllChildrenAsThoughts, getChildren, isVisible } from '../selectors/getChildren'
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
  const children = getAllChildrenAsThoughts(state, head(simplePath))

  if (children.length === 0) return state

  /** Returns first moved child path as new cursor after collapse. */
  const getNewCursor = (state: State) => {
    const firstVisibleChildOfPrevCursor = (state.showHiddenThoughts ? children : children.filter(isVisible(state)))[0]

    const parentId = head(rootedParentOf(state, simplePath))
    const childrenOfMovedContext = getChildren(state, parentId)

    if (!firstVisibleChildOfPrevCursor) return parentOf(path)

    const newChild =
      childrenOfMovedContext.find(child => child.id === firstVisibleChildOfPrevCursor.id) || childrenOfMovedContext[0]

    return newChild && appendToPath(parentOf(path), newChild.id)
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

export default _.curryRight(collapseContext)
