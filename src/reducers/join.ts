import _ from 'lodash'
import existingThoughtChange from './existingThoughtChange'
import { getAllChildren, getChildPath, getNextRank, simplifyPath } from '../selectors'
import { head, parentOf, pathToContext, reducerFlow } from '../util'
import { State } from '../util/initialState'
import existingThoughtMove from './existingThoughtMove'
import existingThoughtDelete from './existingThoughtDelete'

/** Join two or more thoughts split by spaces. */
const join = (state: State) => {

  const { cursor } = state

  if (!cursor) return state

  const context = pathToContext(parentOf(cursor))
  const contextChildren = getAllChildren(state, context)
  const { value, rank } = head(cursor)
  const siblings = contextChildren.filter(child => child.value !== value && child.rank !== rank)

  let nextRankMin = getNextRank(state, context)

  const reducers = contextChildren.reduce((acc, sibling, index) => {

    const pathToSibling = [...parentOf(cursor), sibling]
    const children = getAllChildren(state, pathToContext(pathToSibling))

    return [...acc, ...children.map((child, i) => {
      const simplePath = simplifyPath(state, pathToSibling)
      const oldPath = getChildPath(state, child, simplePath)
      const newPath = [...cursor, { ...child, rank: nextRankMin += 1 }]
      return existingThoughtMove({ oldPath, newPath })
    })]

  }, [] as _.RightCurriedFunction1<State, State>[])

  const newValue = contextChildren.reduce((acc, { value }) => `${acc} ${value}`, '').trim()

  const updateThoughtReducer = existingThoughtChange({
    oldValue: value,
    newValue,
    context,
    path: simplifyPath(state, cursor),
  })

  const removalReducers = siblings.map(sibling => existingThoughtDelete({
    context,
    thoughtRanked: sibling
  }))

  return reducerFlow([...reducers, updateThoughtReducer, ...removalReducers])(state)
}

export default _.curryRight(join)
