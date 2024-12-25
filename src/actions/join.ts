import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import getChildPath from '../selectors/getChildPath'
import { getAllChildren, getAllChildrenSorted } from '../selectors/getChildren'
import getNextRank from '../selectors/getNextRank'
import getThoughtById from '../selectors/getThoughtById'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import deleteThought from './deleteThought'
import editThought from './editThought'
import moveThought from './moveThought'

/** Join two or more thoughts split by spaces. Defaults to all non-attribute thoughts at the level of the cursor. */
const join = (state: State, { paths }: { paths?: Path[] } = {}) => {
  const { cursor } = state

  if (!cursor) return state

  const path = cursor
  const simplePath = simplifyPath(state, path)
  const parentId = head(parentOf(simplePath))
  const children = paths
    ? paths.map(path => getThoughtById(state, head(path)))
    : getAllChildrenSorted(state, parentId).filter(child => !isAttribute(child.value))

  // getThoughtById -> Thought | undefined, so we need to filter out possible undefined children
  // and here we ignore missing thoughts, as every function below assumes that the thought exists
  // it's very unlikely that thought is missing, but we wanna be safe
  const onlyExistingChildren = children.filter(Boolean)
  const thoughtId = head(simplePath)
  const thought = getThoughtById(state, thoughtId)
  if (!thought) return state
  const { value } = thought

  let minNextRank = getNextRank(state, parentId)

  const moveThoughtReducers = onlyExistingChildren
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
    newValue: onlyExistingChildren.reduce((acc, { value }) => `${acc} ${value}`, '').trim(),
    path: simplePath,
  })

  const siblings = onlyExistingChildren.filter(child => child.id !== thoughtId)
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
