import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import alert from '../actions/alert'
import moveThought from '../actions/moveThought'
import setCursor from '../actions/setCursor'
import findDescendant from '../selectors/findDescendant'
import { getChildren, getChildrenRanked, isVisible } from '../selectors/getChildren'
import getRankBefore from '../selectors/getRankBefore'
import getSortPreference from '../selectors/getSortPreference'
import getSortedRank from '../selectors/getSortedRank'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import createId from '../util/createId'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import deleteThought from './deleteThought'
import editThought from './editThought'
import sort from './sort'

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

  // Determine whether the collapsed context can be inserted continuously after the meta attributes
  // or whether we need to split them and insert separetely.
  // We need to calculate this upfront since we can't rely on `getRankBefore` and `getRankAfter`
  // without applying changes to state incrementally.
  // Conditions where we can insert continously:
  // - No sibling before the collapsed context
  // - We're immediately adjacent to the last sibling meta attribute
  const siblings = getChildrenRanked(state, head(rootedParentOf(state, simplePath)))
  const currentIndex = siblings.findIndex(sibling => sibling.id === head(simplePath))
  const canInsertContinuously = currentIndex <= 0 || isAttribute(siblings[currentIndex - 1].value)

  const metaSiblings = siblings.filter(thought => isAttribute(thought.value))

  // We treat attributes and thoughts separately and insert meta attributes adjacent to existing meta attributes
  const metaChildren = children.filter(thought => isAttribute(thought.value))
  const nonMetaChildren = children.filter(thought => !isAttribute(thought.value))

  // Calculate rank increment and start for non-meta children
  const rankStart = getRankBefore(state, simplePath)
  const rankIncrement = canInsertContinuously
    ? (thought.rank - rankStart) / Math.max(children.length + 1, 1)
    : (thought.rank - rankStart) / Math.max(nonMetaChildren.length, 1)

  const metaRankStart = canInsertContinuously
    ? rankStart
    : metaSiblings.length
      ? metaSiblings[metaSiblings.length - 1].rank
      : getThoughtById(state, head(rootedParentOf(state, simplePath))).rank
  const metaRankIncrement = canInsertContinuously
    ? rankIncrement
    : (rankStart - metaRankStart) / Math.max(metaChildren.length + 1, 1)

  // Find the sort preference, if any
  const parentId = head(rootedParentOf(state, simplePath))
  const contextHasSortPreference = getSortPreference(state, head(simplePath)).type !== 'None'
  const parentHasSortPreference = getSortPreference(state, parentId).type !== 'None'
  const sortId = findDescendant(state, head(simplePath), ['=sort'])

  // Find attributes to delete
  const pinAttributeId = findDescendant(state, head(simplePath), '=pin')
  const childrenAttributeId = findDescendant(state, head(simplePath), '=children')
  const childrenPinAttributeId = childrenAttributeId ? findDescendant(state, childrenAttributeId, '=pin') : null
  const shouldDeleteChildrenAttribute =
    childrenAttributeId &&
    getChildren(state, childrenAttributeId).filter(thought => thought.value !== '=pin').length === 0

  return reducerFlow([
    // first edit the collapsing thought to a unique value
    // otherwise, it could get merged when children are outdented in the next step
    editThought({
      oldValue: thought.value,
      newValue: createId(), // unique value
      path: simplePath,
    }),

    // Sort parent context if sort preference exists and parent does not have a sort preference
    // Sort preference must be moved up before sort to prevent conversion to manual sort.
    contextHasSortPreference && !parentHasSortPreference
      ? reducerFlow([
          moveThought({
            oldPath: appendToPath(simplePath, sortId!),
            newPath: appendToPath(parentOf(simplePath), sortId!),
            newRank: getRankBefore(state, simplePath),
          }),
          sort(parentId),
        ])
      : null,

    // outdent each child
    ...children.map((child, i) => (state: State) => {
      // Skip =sort since it has already been moved to the parent.
      if (contextHasSortPreference && child.value === '=sort') return state

      return moveThought(state, {
        oldPath: appendToPath(simplePath, child.id),
        newPath: appendToPath(parentOf(simplePath), child.id),
        newRank:
          contextHasSortPreference || parentHasSortPreference
            ? getSortedRank(state, parentId, child.value)
            : rankStart + rankIncrement * i,
      })
    }),

    // // outdent each child
    // ...metaChildren.map((child, i) => {
    //   const newRank = metaRankStart + metaRankIncrement * i
    //   return moveThought({
    //     oldPath: appendToPath(simplePath, child.id),
    //     newPath: appendToPath(parentOf(simplePath), child.id),
    //     newRank,
    //   })
    // }),
    // ...nonMetaChildren.map((child, i) => {
    //   const newRank = canInsertContinuously
    //     ? rankStart + rankIncrement * (i + metaChildren.length)
    //     : rankStart + rankIncrement * (i + 1)
    //   return moveThought({
    //     oldPath: appendToPath(simplePath, child.id),
    //     newPath: appendToPath(parentOf(simplePath), child.id),
    //     newRank,
    //   })
    // }),

    // delete =pin
    pinAttributeId &&
      deleteThought({
        pathParent: parentOf(simplePath),
        thoughtId: pinAttributeId,
      }),
    // delete =children/=pin
    childrenPinAttributeId &&
      deleteThought({
        pathParent: parentOf(simplePath),
        thoughtId: childrenPinAttributeId,
      }),
    // delete =children if it has no remaining children after collapsing
    childrenAttributeId && shouldDeleteChildrenAttribute
      ? deleteThought({
          pathParent: parentOf(simplePath),
          thoughtId: childrenAttributeId,
        })
      : null,

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
