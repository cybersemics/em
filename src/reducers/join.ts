import _ from 'lodash'
import editThought from './editThought'
import { getAllChildren, getChildPath, getNextRank, simplifyPath } from '../selectors'
import { appendToPath, head, parentOf, pathToContext, reducerFlow } from '../util'
import moveThought from './moveThought'
import deleteThought from './deleteThought'
import { State } from '../@types'

/** Join two or more thoughts split by spaces. */
const join = (state: State) => {
  const { cursor } = state

  if (!cursor) return state

  const path = cursor
  const simplePath = simplifyPath(state, path)
  const context = pathToContext(parentOf(simplePath))
  const contextChildren = getAllChildren(state, context)
  const { value, rank } = head(simplePath)
  const siblings = contextChildren.filter(child => child.value !== value && child.rank !== rank)

  let minNextRank = getNextRank(state, context)

  const reducers = contextChildren
    .map((sibling, i) => {
      const pathToSibling = appendToPath(parentOf(simplePath), sibling)
      const siblingContext = [...context, sibling.value]
      const children = getAllChildren(state, siblingContext)

      return children.map((child, j) => {
        const oldPath = getChildPath(state, child, pathToSibling)
        const newPath = appendToPath(path, { ...child, rank: (minNextRank += 1) })
        return moveThought({ oldPath, newPath })
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
      thoughtRanked: sibling,
    }),
  )

  return reducerFlow([...reducers, updateThoughtReducer, ...removalReducers])(state)
}

export default _.curryRight(join)
