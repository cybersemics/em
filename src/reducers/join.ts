import _ from 'lodash'
import editThought from './editThought'
import { getAllChildren, getChildPath, getNextRank, getThoughtById, simplifyPath } from '../selectors'
import { appendToPath, head, parentOf, pathToContext, reducerFlow } from '../util'
import moveThought from './moveThought'
import deleteThought from './deleteThought'
import { State } from '../@types'
import { getAllChildrenAsThoughtsById } from '../selectors/getChildren'

/** Join two or more thoughts split by spaces. */
const join = (state: State) => {
  const { cursor } = state

  if (!cursor) return state

  const path = cursor
  const simplePath = simplifyPath(state, path)
  const parentId = head(parentOf(simplePath))
  const context = pathToContext(state, parentOf(simplePath))
  const contextChildren = getAllChildrenAsThoughtsById(state, parentId)
  const thoughtId = head(simplePath)
  const { value, rank } = getThoughtById(state, thoughtId)
  const siblings = contextChildren.filter(child => child.value !== value && child.rank !== rank)

  let minNextRank = getNextRank(state, parentId)

  const reducers = contextChildren
    .map((sibling, i) => {
      const pathToSibling = appendToPath(parentOf(simplePath), sibling.id)
      const siblingContext = [...context, sibling.value]
      const children = getAllChildren(state, siblingContext)

      return children.map((child, j) => {
        const oldPath = getChildPath(state, child, pathToSibling)
        const newPath = appendToPath(path, child)
        return moveThought({ oldPath, newPath, newRank: (minNextRank += 1) })
      })
    })
    .flat()

  const newValue = contextChildren.reduce((acc, { value }) => `${acc} ${value}`, '').trim()

  const updateThoughtReducer = editThought({
    oldValue: value,
    newValue,
    context,
    path: simplePath,
  })

  const removalReducers = siblings.map(sibling =>
    deleteThought({
      context,
      thoughtId: sibling.id,
    }),
  )

  return reducerFlow([...reducers, updateThoughtReducer, ...removalReducers])(state)
}

export default _.curryRight(join)
