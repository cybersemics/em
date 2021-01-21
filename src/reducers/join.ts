import _ from 'lodash'
import existingThoughtChange from './existingThoughtChange'
import { getAllChildren, getChildPath, getNextRank, getPrevRank, simplifyPath } from '../selectors'
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

  const cursorIndex = contextChildren.findIndex(child => child.value === value && child.rank === rank)
  const contextChildrenCount = contextChildren.slice(0, cursorIndex).reduce((acc, sibling) => {
    return acc + getAllChildren(state, pathToContext([...parentOf(cursor), sibling])).length
  }, 0)

  let prevRankMin = getPrevRank(state, context) - contextChildrenCount
  let nextRankMin = getNextRank(state, context)

  const reducers = siblings.reduce((acc, sibling, index) => {

    const pathToSibling = [...parentOf(cursor), sibling]
    const children = getAllChildren(state, pathToContext(pathToSibling))

    return [...acc, ...children.map((child, i) => {
      const simplePath = simplifyPath(state, pathToSibling)
      const oldPath = getChildPath(state, child, simplePath)
      const newPath = [...cursor, { ...child, rank: index < cursorIndex ? prevRankMin += 1 : nextRankMin += 1 }]

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
