import _ from 'lodash'
import existingThoughtChange from './existingThoughtChange'
import { getAllChildren, getChildPath, getNextRank, getPrevRank } from '../selectors'
import { SimplePath } from '../types'
import { head, parentOf, pathToContext, reducerFlow } from '../util'
import { State } from '../util/initialState'
import existingThoughtMove from './existingThoughtMove'
import existingThoughtDelete from './existingThoughtDelete'

/** Join two or more thoughts split by spaces. */
const join = (state: State) => {

  const { cursor } = state

  if (!cursor) return state

  const contextRanked = pathToContext(parentOf(cursor))
  const contextChildren = getAllChildren(state, contextRanked)
  const { value, rank } = head(cursor)
  const siblings = contextChildren.filter(child => child.value !== value && child.rank !== rank)

  const actions = siblings.reduce((acc, sibling, index) => {

    const pathToSibling = [...parentOf(cursor), sibling]
    const children = getAllChildren(state, pathToContext(pathToSibling))

    return [...acc, ...children.map(child => {
      const oldPath = getChildPath(state, child, pathToSibling as SimplePath)
      const newPath = [...cursor, { ...child, rank: index === 1 ? getNextRank(state, pathToContext(pathToSibling)) : getPrevRank(state, pathToContext(pathToSibling)) }]

      return existingThoughtMove({ oldPath, newPath })

    })]

  }, [] as _.RightCurriedFunction1<State, State>[])

  const newValue = contextChildren.reduce((acc, { value }) => `${acc} ${value}`, '').trim()

  const updateThoughtAction = existingThoughtChange({
    oldValue: value,
    newValue,
    context: contextRanked,
    path: cursor as SimplePath,
  })

  const removalActions = siblings.map(sibling => existingThoughtDelete({
    context: contextRanked,
    thoughtRanked: sibling
  }))

  return reducerFlow([...actions, updateThoughtAction, ...removalActions])(state)
}

export default _.curryRight(join)
