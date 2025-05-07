import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import getChildPath from '../selectors/getChildPath'
import { getAllChildren, getAllChildrenSorted } from '../selectors/getChildren'
import getNextRank from '../selectors/getNextRank'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import deleteThought from './deleteThought'
import editThought from './editThought'
import moveThought from './moveThought'

/** Trailing hyphen that should be removed when joining block formatted text from print or pdf. */
const REGEX_HYPHEN = /-$/

/** Join two or more thoughts split by spaces. Defaults to all non-attribute thoughts at the level of the cursor. */
const join = (state: State, { paths }: { paths?: Path[] } = {}) => {
  const { cursor } = state

  if (!cursor) return state

  const path = cursor
  const simplePath = simplifyPath(state, path)
  const parentId = head(rootedParentOf(state, simplePath))

  const children = paths
    ? // getThoughtById -> Thought | undefined, so if we (unlikely) get undefined, we filter it out, see getThoughtById
      paths.map(path => getThoughtById(state, head(path))).filter(Boolean)
    : getAllChildrenSorted(state, parentId).filter(child => !isAttribute(child.value))

  const thoughtId = head(simplePath)
  const thought = getThoughtById(state, thoughtId)
  if (!thought) return state
  const { value } = thought

  let minNextRank = getNextRank(state, parentId)

  const moveThoughtReducers = children
    .map(child => {
      const pathToSibling = appendToPath(parentOf(simplePath), child.id)
      const grandchildren = getAllChildren(state, child.id)

      return grandchildren.map(child => {
        const oldPath = getChildPath(state, child, pathToSibling)
        const newPath = appendToPath(path, child)
        return moveThought({ oldPath, newPath, newRank: (minNextRank += 1) })
      })
    })
    .flat()

  const editThoughtReducer = editThought({
    oldValue: value,
    newValue: children
      .reduce(
        (acc, { value }) =>
          // if the last character of the accumulator is a hyphen, remove it before joining, and omit the space separator
          // e.g.
          // 'race' + 'car' -> 'race car'
          // 'race-' + 'car' -> 'racecar'
          REGEX_HYPHEN.test(acc) ? `${acc.replace(REGEX_HYPHEN, '')}${value}` : `${acc} ${value}`,
        '',
      )
      .trim(),
    path: simplePath,
  })

  const siblings = children.filter(child => child.id !== thoughtId)
  const deleteThoughtReducers = siblings.map(sibling =>
    deleteThought({
      pathParent: parentOf(simplePath),
      thoughtId: sibling.id,
    }),
  )

  return reducerFlow([...moveThoughtReducers, editThoughtReducer, ...deleteThoughtReducers])(state)
}

/** Action-creator for join. */
export const joinActionCreator =
  (payload: Parameters<typeof join>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'join', ...payload })

export default _.curryRight(join)

// Register this action's metadata
registerActionMetadata('join', {
  undoable: true,
})
